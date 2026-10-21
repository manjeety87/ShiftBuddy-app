import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ScheduleMessageCard } from '../components/ScheduleMessageCard';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { formatShareExpiry, getIncomingShares, getOutgoingShares, SHARE_DURATIONS, shareShifts, stopSharing, type OutgoingShare, type ShareDuration } from '../lib/shares';
import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { showAlert } from '../lib/dialog';
import { ThemedInput } from '../components/ui/ThemedInput';
import { Button } from '../components/ui/Button';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

const initialOf = (text: string) => text.trim().charAt(0).toUpperCase();

function SectionLabel({ children }: { children: string }) {
    return (
        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginTop: spacing.lg, marginBottom: 8, marginLeft: 4 }}>
            {children}
        </ThemedText>
    );
}

function Avatar({ label, color }: { label: string; color: string }) {
    return (
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(color, 0.15) }}>
            <ThemedText weight="bold" color={color}>{initialOf(label)}</ThemedText>
        </View>
    );
}

/** Who can see my shifts (and until when), plus the schedules others share with me. */
export default function SharingScreen() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const outgoing = useFetch(getOutgoingShares);
    const incoming = useFetch(getIncomingShares);
    const { refetch: refetchOutgoing } = outgoing;
    const { refetch: refetchIncoming } = incoming;
    useFocusEffect(useCallback(() => { refetchOutgoing(); refetchIncoming(); }, [refetchOutgoing, refetchIncoming]));

    const [email, setEmail] = useState('');
    const [duration, setDuration] = useState<ShareDuration>('week');
    const [isSharing, setIsSharing] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const handleShare = async () => {
        if (!email.trim()) return;
        setIsSharing(true);
        setNotice(null);
        try {
            const share = await shareShifts(email, duration);
            setEmail('');
            setNotice(
                share.status === 'pending'
                    ? `${share.email} doesn’t have ShiftBuddy yet. They’ll see your shifts once they join with this email and verify it.`
                    : `${share.name ?? share.email} can now see your shifts.`
            );
            refetchOutgoing();
        } catch (err: any) {
            const details = err?.response?.data?.details;
            showAlert('Couldn’t share', details?.[0]?.message || err?.response?.data?.message || 'Please try again.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleStop = (share: OutgoingShare) => {
        showAlert(`Stop sharing with ${share.name ?? share.email}?`, 'They won’t see your shifts anymore.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Stop Sharing', style: 'destructive',
                onPress: async () => {
                    try {
                        await stopSharing(share.id);
                        refetchOutgoing();
                    } catch {
                        showAlert('Couldn’t stop sharing', 'Please try again.');
                    }
                },
            },
        ]);
    };

    const card = { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' as const };

    return (
        <KeyboardSafeView>
            <SheetHeader title="Sharing" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
               
            >
                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>SEND AS A MESSAGE</ThemedText>
                <ScheduleMessageCard />
                <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginLeft: 4 }}>
                    A one-off snapshot for WhatsApp or text. It won’t update when your shifts change.
                </ThemedText>

                <SectionLabel>SHARE LIVE IN THE APP</SectionLabel>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.sm, marginHorizontal: 4 }}>
                    <Lock color={colors.textSecondary} size={14} style={{ marginTop: 2 }} />
                    <ThemedText variant="muted" size="xs" style={{ flex: 1, lineHeight: 17 }}>
                        They always see your latest shifts, for as long as you choose. Only times and job names — never pay, notes or addresses.
                    </ThemedText>
                </View>
                <View style={[card, { padding: spacing.md, gap: spacing.md }]}>
                    <ThemedInput
                        value={email}
                        onChangeText={(text) => { setEmail(text); setNotice(null); }}
                        placeholder="Their email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        keyboardType="email-address"
                        returnKeyType="send"
                        onSubmitEditing={handleShare}
                        style={{ backgroundColor: colors.background }}
                    />
                    <SegmentedControl options={SHARE_DURATIONS} value={duration} onChange={setDuration} accessibilityLabel="How long to share" />
                    <Button label="Share" onPress={handleShare} isLoading={isSharing} disabled={!email.trim()} />
                    {notice && <ThemedText size="sm" color={colors.success}>{notice}</ThemedText>}
                </View>

                <SectionLabel>WHO CAN SEE YOUR SHIFTS</SectionLabel>
                <View style={card}>
                    {outgoing.isLoading && !outgoing.data ? (
                        <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />
                    ) : !outgoing.data?.length ? (
                        <ThemedText variant="muted" size="sm" style={{ padding: spacing.md }}>Only you, for now.</ThemedText>
                    ) : (
                        outgoing.data.map((share, i) => (
                            <View key={share.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                                <Avatar label={share.name ?? share.email} color={colors.primary} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText weight="medium" numberOfLines={1}>{share.name ?? share.email}</ThemedText>
                                    <ThemedText variant="muted" size="xs" numberOfLines={1}>
                                        {share.status === 'pending' ? 'Invite sent · ' : ''}{formatShareExpiry(share.expiresAt)}
                                    </ThemedText>
                                </View>
                                <PressableScale onPress={() => handleStop(share)} hitSlop={8} pressedScale={1} pressedStyle={{ opacity: 0.5 }} accessibilityRole="button" accessibilityLabel={`Stop sharing with ${share.name ?? share.email}`}>
                                    <ThemedText size="sm" weight="semibold" color={colors.danger}>Stop</ThemedText>
                                </PressableScale>
                            </View>
                        ))
                    )}
                </View>

                <SectionLabel>SHARED WITH YOU</SectionLabel>
                {user && !user.isEmailVerified && (
                    <PressableScale
                        onPress={() => router.push('/verify-email')}
                        accessibilityRole="button"
                        pressedScale={0.98}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.lg, backgroundColor: withAlpha(colors.warning, 0.12) }}
                    >
                        <ThemedText size="sm" style={{ flex: 1 }}>
                            Verify your email so schedules shared with <ThemedText size="sm" weight="semibold">{user.email}</ThemedText> can reach you.
                        </ThemedText>
                        <ChevronRight color={colors.warning} size={18} />
                    </PressableScale>
                )}
                <View style={card}>
                    {incoming.isLoading && !incoming.data ? (
                        <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />
                    ) : !incoming.data?.length ? (
                        <ThemedText variant="muted" size="sm" style={{ padding: spacing.md }}>Nobody’s sharing their shifts with you yet.</ThemedText>
                    ) : (
                        incoming.data.map((share, i) => (
                            <PressableScale
                                key={share.id}
                                onPress={() => router.push(`/shared/${share.owner.id}`)}
                                accessibilityRole="button"
                                pressedScale={1}
                                pressedStyle={{ backgroundColor: colors.surfaceLight }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}
                            >
                                <Avatar label={share.owner.name} color={colors.info} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText weight="medium" numberOfLines={1}>{share.owner.name}</ThemedText>
                                    <ThemedText variant="muted" size="xs">{formatShareExpiry(share.expiresAt, 'Until they stop sharing')}</ThemedText>
                                </View>
                                <ChevronRight color={colors.textMuted} size={18} />
                            </PressableScale>
                        ))
                    )}
                </View>
            </ScrollView>
        </KeyboardSafeView>
    );
}
