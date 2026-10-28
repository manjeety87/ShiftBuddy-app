import * as Speech from 'expo-speech';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowUp, Check, Mic, Square, Volume2, VolumeX } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProposalCard } from '../components/assistant/ProposalCard';
import { TextButton } from '../components/ui/Button';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedInput } from '../components/ui/ThemedInput';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { confirmProposal, sendToAssistant, sendVoiceToAssistant, type AssistantAction, type AssistantPage, type AssistantTurn, type HistoryLine, type Proposal, type Saved } from '../lib/assistant';
import { useAuth } from '../lib/auth-context';
import { keyValueStore } from '../lib/keyValueStore';
import { clearShiftMissed } from '../lib/missedShifts';
import { motion } from '../lib/motion';
import { deleteShift } from '../lib/shifts';
import { useTheme } from '../lib/theme-context';
import { deleteTimeEntry } from '../lib/timesheet';
import { useVoiceRecorder } from '../lib/useVoiceRecorder';

interface Message {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    /** The service failed; not sent back as part of the conversation */
    failed?: boolean;
    retry?: string;
    saved?: Saved;
    undone?: boolean;
}

// Ways in, in the voices people actually use: plain English, Hinglish, a question, a place
const EXAMPLES = ['Add a shift tomorrow, 9 to 5', 'Kal 9 se 5 ki shift hai', 'Wednesday ko nahi ja paunga', 'When is my next shift?', 'Show my calendar'];
const VOICE_KEY = 'assistantVoice';

// The conversation outlives the sheet: "show my Friday shift" closes it to open the
// shift, and opening it again carries on. One person's conversation never shows for the next.
let memory: { userId: string; messages: Message[]; pending: Proposal | null } | null = null;
let nextId = 1;

const TABS: Partial<Record<AssistantPage, Href>> = { home: '/(tabs)', shifts: '/(tabs)/shifts', calendar: '/(tabs)/calendar', jobs: '/(tabs)/jobs', settings: '/(tabs)/settings' };
const SHEETS: Record<string, Href> = {
    timesheet: '/timesheet',
    sharing: '/sharing',
    newShift: '/create-shift',
    newJob: '/create-job',
    addHours: '/edit-time-entry/new',
    paySummary: '/pay-summary',
    scan: '/import-schedule',
    statement: '/statement',
    themes: '/theme-settings',
};

const errorText = (err: any) => err?.response?.data?.message ?? 'Couldn’t reach ShiftBuddy. Check your connection and try again.';

/** What a Save on the card did, said the way the button said it */
const savedText = (saved: Saved) => {
    if (saved.type === 'editShift') return 'Shift changed.';
    if (saved.type === 'removeShifts') return saved.count === 1 ? 'Shift removed.' : `${saved.count} shifts removed.`;
    if (saved.type === 'markMissed') return 'Marked as missed.';
    if (saved.type === 'logHours') return 'Hours added.';
    const added = saved.count === 1 ? 'Shift added.' : `${saved.count} shifts added.`;
    return saved.skipped ? `${added} ${saved.skipped} clashed with shifts you have and ${saved.skipped === 1 ? 'was' : 'were'} skipped.` : added;
};

/** Devanagari is read by a Hindi voice; English and Hinglish in Roman letters by an Indian-English one */
const voiceLanguageOf = (text: string) => (/[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN');

/**
 * The assistant: talk or type, and ShiftBuddy adds shifts, marks one missed, adds
 * hours or opens a place. Anything that saves waits on a card for a yes. Listening
 * is hands-free: it records until you pause, answers out loud, then listens again.
 */
export default function AssistantScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { from } = useLocalSearchParams<{ from?: AssistantPage }>();
    const kept = memory && memory.userId === user?.id ? memory : null;
    const [messages, setMessages] = useState<Message[]>(kept?.messages ?? []);
    const [pending, setPending] = useState<Proposal | null>(kept?.pending ?? null);
    const [phase, setPhase] = useState<'idle' | 'thinking' | 'speaking'>('idle');
    const [handsFree, setHandsFree] = useState(true);
    const [voice, setVoice] = useState<'on' | 'off'>('on');
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState('');
    const scroller = useRef<ScrollView>(null);
    const closed = useRef(false);

    // Read inside async flows, where state from the render that started them is stale
    const live = useRef({ messages, pending, handsFree, voice });
    useEffect(() => {
        live.current = { messages, pending, handsFree, voice };
        if (user) memory = { userId: user.id, messages, pending };
    });

    useEffect(() => {
        keyValueStore.getItem(VOICE_KEY).then((saved) => saved === 'off' && setVoice('off')).catch(() => undefined);
    }, []);

    const add = useCallback((message: Omit<Message, 'id'>) => setMessages((list) => [...list, { ...message, id: nextId++ }]), []);

    const historyNow = (): HistoryLine[] => live.current.messages.filter((line) => !line.failed).map(({ role, text }) => ({ role, text }));

    const say = (text: string) =>
        new Promise<void>((resolve) => {
            if (live.current.voice !== 'on' || closed.current) return resolve();
            setPhase('speaking');
            // A phone without a voice for this language may never say it's done: don't wait forever
            const giveUp = setTimeout(resolve, 3000 + text.length * 90);
            const done = () => {
                clearTimeout(giveUp);
                resolve();
            };
            Speech.speak(text, { language: voiceLanguageOf(text), onDone: done, onStopped: done, onError: done });
        });

    const runActions = (actions: AssistantAction[]) => {
        const action = actions.find((item) => item.type !== 'closePanels');
        if (!action) return false;
        // The assistant is itself a sheet: it steps aside for the place it opens
        closed.current = true;
        Speech.stop();
        if (action.type === 'openShift') router.replace(`/edit-shift/${action.shiftId}`);
        else if (action.type === 'openPage' && TABS[action.page]) router.dismissTo(TABS[action.page]!);
        else router.replace(SHEETS[action.type === 'openPage' ? action.page : action.panel]);
        return true;
    };

    const listenAgain = useRef<() => void>(() => {});

    const finishTurn = async (turn: AssistantTurn, saved: Saved | null) => {
        add({ role: 'assistant', text: turn.reply, saved: saved ?? undefined });
        setPending(turn.pending);
        if (runActions(turn.actions)) return;
        await say(turn.reply);
        setPhase('idle');
        if (live.current.handsFree && !closed.current) listenAgain.current();
    };

    const fail = (err: unknown, retry?: string) => {
        add({ role: 'assistant', text: errorText(err), failed: true, retry });
        // A failing service isn't talked at in a loop: listening waits for a tap
        setHandsFree(false);
        setPhase('idle');
    };

    const sendText = async (text: string) => {
        const message = text.trim();
        if (!message || phase === 'thinking') return;
        recorder.cancel();
        Speech.stop();
        const history = historyNow();
        add({ role: 'user', text: message });
        setDraft('');
        setPhase('thinking');
        try {
            const turn = await sendToAssistant({ message, history, pending: live.current.pending, page: from });
            await finishTurn(turn, turn.saved);
        } catch (err) {
            fail(err, message);
        }
    };

    const sendRecording = async (uri: string) => {
        setPhase('thinking');
        try {
            const turn = await sendVoiceToAssistant(uri, { history: historyNow(), pending: live.current.pending, page: from });
            if (!('reply' in turn)) {
                add({ role: 'assistant', text: 'I didn’t catch that — say it again?' });
                setPhase('idle');
                if (live.current.handsFree && !closed.current) listenAgain.current();
                return;
            }
            add({ role: 'user', text: turn.heard });
            await finishTurn(turn, turn.saved);
        } catch (err) {
            fail(err);
        }
    };

    const recorder = useVoiceRecorder({ onRecording: (uri) => void sendRecording(uri) });
    useEffect(() => {
        listenAgain.current = () => void recorder.start();
    });

    // Opening the assistant starts listening; leaving it ends listening and speech
    useEffect(() => {
        void recorder.start();
        return () => {
            closed.current = true;
            recorder.cancel();
            Speech.stop();
        };
        // Only on open and close
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        scroller.current?.scrollToEnd({ animated: true });
    }, [messages.length, phase, pending]);

    const onMic = () => {
        if (phase === 'speaking') {
            Speech.stop();
            return;
        }
        if (recorder.listening) {
            setHandsFree(false);
            void recorder.tap();
            return;
        }
        setHandsFree(true);
        void recorder.start();
    };

    const save = async () => {
        if (!pending) return;
        Speech.stop();
        setSaving(true);
        try {
            const saved = await confirmProposal(pending);
            setPending(null);
            const text = savedText(saved);
            add({ role: 'assistant', text, saved });
            await say(text);
            setPhase('idle');
        } catch (err) {
            add({ role: 'assistant', text: errorText(err), failed: true });
        } finally {
            setSaving(false);
        }
    };

    const undo = async (message: Message) => {
        const saved = message.saved;
        if (!saved) return;
        try {
            if (saved.undo) await confirmProposal(saved.undo);
            else if (saved.type === 'addShifts') await Promise.all(saved.shiftIds.map(deleteShift));
            else if (saved.type === 'markMissed') await clearShiftMissed(saved.shiftIds[0]);
            else if (saved.entryId) await deleteTimeEntry(saved.entryId);
            setMessages((list) => list.map((line) => (line.id === message.id ? { ...line, undone: true } : line)));
        } catch (err) {
            add({ role: 'assistant', text: errorText(err), failed: true });
        }
    };

    const toggleVoice = () => {
        const next = voice === 'on' ? 'off' : 'on';
        if (next === 'off') Speech.stop();
        setVoice(next);
        keyValueStore.setItem(VOICE_KEY, next).catch(() => undefined);
    };

    // The halo is the microphone's level, frame by frame
    const halo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + recorder.level.get() * 0.6 }], opacity: 0.25 + recorder.level.get() * 0.2 }));

    const status = recorder.error === 'blocked'
        ? 'The microphone is off for ShiftBuddy. Allow it in Settings, or type instead.'
        : recorder.error === 'failed'
          ? 'The microphone couldn’t start. Type instead, or try again.'
          : phase === 'thinking'
            ? 'Thinking…'
            : phase === 'speaking'
              ? 'Speaking — tap the mic to skip'
              : recorder.listening
                ? recorder.tapToSend
                    ? 'Listening… tap the mic when you’re done'
                    : 'Listening…'
                : recorder.quiet
                  ? 'I didn’t hear anything. Tap the mic to talk.'
                  : 'Tap the mic and talk, or type.';

    return (
        <KeyboardSafeView style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Assistant" onCancel={() => router.back()} />

            <ScrollView ref={scroller} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                {messages.length === 0 ? (
                    <Animated.View entering={motion.appear}>
                        <ThemedText size="xl" weight="semibold">
                            Tell me about your shifts.
                        </ThemedText>
                        <ThemedText variant="secondary" style={{ marginTop: spacing.xs }}>
                            Add one, say you can’t make it, add the hours you worked, or ask me to open something. English or Hinglish, however you talk.
                        </ThemedText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
                            {EXAMPLES.map((example) => (
                                <PressableScale
                                    key={example}
                                    onPress={() => void sendText(example)}
                                    disabled={phase === 'thinking'}
                                    accessibilityRole="button"
                                    style={{ backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
                                >
                                    <ThemedText size="sm">{example}</ThemedText>
                                </PressableScale>
                            ))}
                        </View>
                    </Animated.View>
                ) : (
                    messages.map((message) =>
                        message.role === 'user' ? (
                            <Animated.View key={message.id} entering={motion.appear} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary + '1F', borderRadius: radius.lg, borderBottomRightRadius: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
                                <ThemedText>{message.text}</ThemedText>
                            </Animated.View>
                        ) : (
                            <Animated.View key={message.id} entering={motion.appear} style={{ maxWidth: '92%' }}>
                                <ThemedText color={message.failed ? colors.danger : undefined}>{message.text}</ThemedText>
                                {message.failed && message.retry && <TextButton label="Try Again" size="sm" onPress={() => void sendText(message.retry!)} style={{ marginTop: 4 }} />}
                                {message.saved && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                        {message.undone ? (
                                            <ThemedText variant="secondary" size="sm">Undone</ThemedText>
                                        ) : (
                                            <>
                                                <Check color={colors.success} size={14} />
                                                <ThemedText variant="secondary" size="sm">Saved</ThemedText>
                                                <TextButton label="Undo" size="sm" onPress={() => void undo(message)} />
                                            </>
                                        )}
                                    </View>
                                )}
                            </Animated.View>
                        )
                    )
                )}
                {phase === 'thinking' && <ActivityIndicator color={colors.textMuted} style={{ alignSelf: 'flex-start' }} accessibilityLabel="Thinking" />}
            </ScrollView>

            {pending && (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                    <ProposalCard proposal={pending} busy={saving} listening={recorder.listening} onSave={() => void save()} onDismiss={() => setPending(null)} />
                </View>
            )}

            <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceLight, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.md), gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <ThemedText size="sm" color={recorder.error ? colors.danger : colors.textSecondary} style={{ flex: 1 }} accessibilityLiveRegion="polite">
                        {status}
                    </ThemedText>
                    <PressableScale onPress={toggleVoice} accessibilityRole="button" accessibilityLabel={voice === 'on' ? 'Stop reading replies aloud' : 'Read replies aloud'} hitSlop={10} style={{ padding: 4 }}>
                        {voice === 'on' ? <Volume2 color={colors.textSecondary} size={20} /> : <VolumeX color={colors.textSecondary} size={20} />}
                    </PressableScale>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <ThemedInput
                            value={draft}
                            onChangeText={setDraft}
                            placeholder={recorder.listening ? 'Listening — or type here' : 'Type a message'}
                            returnKeyType="send"
                            onSubmitEditing={() => void sendText(draft)}
                            maxLength={500}
                            accessibilityLabel="Message"
                            style={{ flex: 1, borderRadius: radius.full, paddingRight: draft.trim() ? 48 : 16 }}
                        />
                        {draft.trim() !== '' && (
                            <PressableScale onPress={() => void sendText(draft)} disabled={phase === 'thinking'} accessibilityRole="button" accessibilityLabel="Send" style={{ position: 'absolute', right: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <ArrowUp color={colors.onPrimary} size={18} />
                            </PressableScale>
                        )}
                    </View>
                    <PressableScale
                        onPress={onMic}
                        disabled={phase === 'thinking'}
                        accessibilityRole="button"
                        accessibilityLabel={phase === 'speaking' ? 'Stop speaking' : recorder.listening ? 'Stop listening' : 'Talk'}
                        accessibilityState={{ selected: recorder.listening }}
                        style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', opacity: phase === 'thinking' ? 0.45 : 1 }}
                    >
                        {recorder.listening && <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary }, halo]} />}
                        <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: recorder.listening ? colors.primary : colors.primary + '1F' }}>
                            {phase === 'thinking' ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : phase === 'speaking' ? (
                                <Square color={colors.primary} fill={colors.primary} size={16} />
                            ) : (
                                <Mic color={recorder.listening ? colors.onPrimary : colors.primary} size={22} />
                            )}
                        </View>
                    </PressableScale>
                </View>
            </View>
        </KeyboardSafeView>
    );
}
