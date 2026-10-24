import { router } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import { hideGettingStarted } from '../lib/onboarding';
import { useTheme } from '../lib/theme-context';
import { TextButton } from './ui/Button';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

export interface GettingStartedProgress {
    hasJob: boolean;
    hasShift: boolean;
    /** undefined: leave-by times are switched off, so the step isn't offered */
    hasHome?: boolean;
    /** undefined: the timesheet is switched off */
    hasClockedIn?: boolean;
}

interface Step {
    done: boolean;
    title: string;
    /** What it gets you, said once in plain words */
    hint: string;
    /** Where the step is done; none for a step that happens on its own later */
    open?: () => void;
    /** Two ways to do it, as buttons in the row instead of one tap target */
    choices?: { label: string; onPress: () => void }[];
}

/**
 * The first four things that make ShiftBuddy useful, in the order they unlock
 * each other. Each row opens the place it's done; a tick appears once the data
 * says it's done (never by tapping). Leaves Home when all four are done or
 * when hidden. The web app's Home has the same card.
 */
export function GettingStarted({ progress }: { progress: GettingStartedProgress }) {
    const { colors } = useTheme();
    // A step for a feature that's switched off is null and left out
    const candidates: (Step | null)[] = [
        { done: progress.hasJob, title: 'Add your job', hint: 'Each place you work, once. Shifts, pay and travel hang off it.', open: () => router.push('/create-job') },
        {
            done: progress.hasShift,
            title: 'Add or scan your shifts',
            hint: 'Type one in, or take a photo of your schedule and we read it.',
            // A shift needs a job first, so until then this waits its turn
            choices: progress.hasJob
                ? [
                      { label: 'Add', onPress: () => router.push('/create-shift') },
                      { label: 'Scan', onPress: () => router.push('/import-schedule') },
                  ]
                : undefined,
        },
        progress.hasHome === undefined ? null : { done: progress.hasHome, title: 'Set your home address', hint: 'So we can tell you when to leave for each shift.', open: () => router.push('/home-address') },
        progress.hasClockedIn === undefined ? null : { done: progress.hasClockedIn, title: 'Clock in at a shift', hint: 'The Clock In button shows on your next shift 10 minutes before it starts.' },
    ];
    const steps = candidates.filter((step): step is Step => step !== null);
    const doneCount = steps.filter((step) => step.done).length;
    if (doneCount === steps.length) return null;

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
                <View style={{ flex: 1 }}>
                    <ThemedText weight="semibold">Getting started</ThemedText>
                    <ThemedText variant="muted" size="xs">{doneCount} of {steps.length} done</ThemedText>
                </View>
                <TextButton label="Hide" size="sm" color={colors.textMuted} onPress={hideGettingStarted} />
            </View>
            <View style={{ height: 4, marginHorizontal: spacing.md, marginBottom: 4, borderRadius: 2, backgroundColor: colors.surfaceLight, overflow: 'hidden' }}>
                <View style={{ width: `${(doneCount / steps.length) * 100}%`, height: '100%', borderRadius: 2, backgroundColor: colors.primary }} />
            </View>

            {steps.map((step) => {
                const body = (
                    <>
                        <View
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: step.done ? colors.primary : 'transparent',
                                borderWidth: step.done ? 0 : 1.5,
                                borderColor: colors.textMuted,
                            }}
                        >
                            {step.done && <Check color={colors.onPrimary} size={14} strokeWidth={3} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText size="sm" weight="medium" color={step.done ? colors.textMuted : undefined} style={step.done ? { textDecorationLine: 'line-through' } : undefined}>
                                {step.title}
                            </ThemedText>
                            {!step.done && <ThemedText variant="muted" size="xs">{step.hint}</ThemedText>}
                        </View>
                        {step.open && !step.done && <ChevronRight color={colors.textMuted} size={18} />}
                        {step.choices && !step.done && (
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                {step.choices.map((choice) => (
                                    <TextButton key={choice.label} label={choice.label} size="sm" onPress={choice.onPress} />
                                ))}
                            </View>
                        )}
                    </>
                );
                const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.surfaceLight };
                return step.open && !step.done ? (
                    <PressableScale key={step.title} onPress={step.open} accessibilityRole="button" accessibilityLabel={`${step.title}. ${step.hint}`} pressedScale={1} pressedStyle={{ opacity: 0.6 }} style={row}>
                        {body}
                    </PressableScale>
                ) : (
                    <View key={step.title} accessible={!step.choices || step.done} accessibilityLabel={`${step.done ? 'Done' : 'To do'}: ${step.title}`} style={row}>
                        {body}
                    </View>
                );
            })}
        </View>
    );
}
