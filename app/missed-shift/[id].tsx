import { router, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { KeyboardSafeView } from '../../components/ui/KeyboardSafeView';
import { PressableScale } from '../../components/ui/PressableScale';
import { SheetHeader } from '../../components/ui/SheetHeader';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { ThemedText } from '../../components/ui/ThemedText';
import { radius, spacing } from '../../constants/themes';
import type { MissedReason, Shift } from '../../interfaces/shift.d';
import { formatTime } from '../../lib/dateUtils';
import { showAlert } from '../../lib/dialog';
import { jobName } from '../../lib/jobLabels';
import { clearShiftMissed, markShiftMissed, MISSED_REASONS } from '../../lib/missedShifts';
import { notify } from '../../lib/notify';
import { getShiftById } from '../../lib/shifts';
import { useTheme } from '../../lib/theme-context';
import { useDiscardGuard } from '../../lib/useDiscardGuard';

/**
 * "Couldn't go" for one shift: sick, called off, an emergency… It stays on the
 * schedule as a record; the backend stops counting it for pay, leave-by and clashes.
 * Opened from Home's card (before or after the shift starts) and from Edit Shift.
 */
export default function MissedShiftScreen() {
    const { colors } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [shift, setShift] = useState<Shift | null>(null);
    const [reason, setReason] = useState<MissedReason | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState<'save' | 'undo' | null>(null);
    const { leave } = useDiscardGuard(
        JSON.stringify({ reason, note: note.trim() }),
        shift && JSON.stringify({ reason: shift.missedReason, note: shift.missedNote ?? '' })
    );

    useEffect(() => {
        getShiftById(id)
            .then((loaded) => {
                setShift(loaded);
                setReason(loaded.missedReason);
                setNote(loaded.missedNote ?? '');
            })
            .catch(() => {
                showAlert('Error', 'Could not load this shift.');
                router.back();
            });
    }, [id]);

    const wasMissed = !!shift?.missedReason;

    const handleSave = async () => {
        if (!reason) return;
        setBusy('save');
        try {
            await markShiftMissed(id, { reason, note: note.trim() });
            leave();
            if (wasMissed) {
                notify.success('Saved');
            } else {
                // A mis-tap on Home costs one tap to fix
                notify.success('Marked as missed', {
                    action: { label: 'Undo', onPress: () => clearShiftMissed(id).catch(() => notify.error('Couldn’t undo — open the shift to try again')) },
                });
            }
        } catch (err: any) {
            showAlert('Could not save', err?.response?.data?.message || 'Please try again.');
            setBusy(null);
        }
    };

    const handleUndo = async () => {
        setBusy('undo');
        try {
            await clearShiftMissed(id);
            leave();
            notify.success('Back on your schedule');
        } catch (err: any) {
            showAlert('Could not save', err?.response?.data?.message || 'Please try again.');
            setBusy(null);
        }
    };

    if (!shift) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const day = new Date(shift.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <KeyboardSafeView>
            <SheetHeader title="Missed Shift" onCancel={() => router.back()} onSave={handleSave} isSaving={busy === 'save'} saveDisabled={!reason || busy !== null} />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl, borderLeftWidth: 4, borderLeftColor: shift.job.color }}>
                    <ThemedText weight="semibold" numberOfLines={1}>{jobName(shift.job)}</ThemedText>
                    <ThemedText variant="secondary" size="sm">{day} · {formatTime(shift.startTime)} – {formatTime(shift.endTime)}</ThemedText>
                </View>

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>WHAT HAPPENED?</ThemedText>
                <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xl }}>
                    {MISSED_REASONS.map((option, index) => {
                        const isSelected = reason === option.value;
                        return (
                            <PressableScale
                                key={option.value}
                                onPress={() => setReason(option.value)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: isSelected }}
                                pressedScale={1}
                                pressedStyle={{ backgroundColor: colors.surfaceLight }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}
                            >
                                <ThemedText weight={isSelected ? 'semibold' : 'normal'} style={{ flex: 1 }}>{option.label}</ThemedText>
                                {isSelected && <Check color={colors.primary} size={20} strokeWidth={2.5} />}
                            </PressableScale>
                        );
                    })}
                </View>

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>NOTE</ThemedText>
                <ThemedInput value={note} onChangeText={setNote} placeholder="Optional — e.g. told Sam at 8 AM" maxLength={500} />
                <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginBottom: spacing.xl, lineHeight: 16 }}>
                    It stays on your schedule, but won’t count toward pay, leave-by times or clashes.
                </ThemedText>

                {wasMissed && (
                    <Button label={shift.missedReason === 'CALLED_OFF' ? 'It’s Back On' : 'I Went After All'} variant="tinted" onPress={handleUndo} isLoading={busy === 'undo'} disabled={busy !== null} />
                )}
            </ScrollView>
        </KeyboardSafeView>
    );
}
