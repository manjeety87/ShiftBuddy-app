import { CheckCircle2, Circle } from 'lucide-react-native';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import type { Shift } from '../interfaces/shift.d';
import { withAlpha } from '../lib/color';
import { formatTime } from '../lib/dateUtils';
import { formatDuration } from '../lib/shiftTime';
import { useTheme } from '../lib/theme-context';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';
import { jobName, jobRole } from '../lib/jobLabels';
import { missedTag } from '../lib/missedShifts';

interface ShiftCardProps {
    shift: Shift;
    onPress?: () => void;
    onLongPress?: () => void;
    selectionMode?: boolean;
    selected?: boolean;
    /** Shift is happening right now */
    isNow?: boolean;
    /** Something is drawn directly under the card (see ShiftHoursRow): no gap below, square bottom corners */
    hasFooter?: boolean;
}

/** One shift in a day-grouped list (the day is in the section header, so no date here). */
export function ShiftCard({ shift, onPress, onLongPress, selectionMode, selected, isNow, hasFooter }: ShiftCardProps) {
    const { colors } = useTheme();
    const minutes = Math.round((Date.parse(shift.endTime) - Date.parse(shift.startTime)) / 60000);
    const missed = shift.missedReason;

    return (
        <PressableScale
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={300}
            accessibilityRole="button"
            accessibilityState={selectionMode ? { selected } : undefined}
            pressedScale={onPress ? 0.98 : 1}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: hasFooter ? 0 : spacing.sm,
                borderBottomLeftRadius: hasFooter ? 0 : radius.md,
                borderBottomRightRadius: hasFooter ? 0 : radius.md,
                borderLeftWidth: 4,
                borderLeftColor: shift.job.color,
                // Missed: still listed, but plainly not a shift to go to
                opacity: selectionMode && !selected ? 0.6 : missed ? 0.65 : 1,
            }}
        >
            {selectionMode && (
                <View style={{ marginRight: spacing.sm }}>
                    {selected ? <CheckCircle2 color={colors.primary} size={22} /> : <Circle color={colors.textMuted} size={22} />}
                </View>
            )}

            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{jobName(shift.job)}</ThemedText>
                    {missed ? (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, backgroundColor: withAlpha(colors.textMuted, 0.15) }}>
                            <ThemedText size="xs" weight="bold" variant="secondary">{missedTag(missed).toUpperCase()}</ThemedText>
                        </View>
                    ) : isNow && (
                        <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full, backgroundColor: withAlpha(colors.success, 0.15) }}>
                            <ThemedText size="xs" weight="bold" color={colors.success}>NOW</ThemedText>
                        </View>
                    )}
                </View>
                {!!jobRole(shift.job) && <ThemedText variant="secondary" size="sm" numberOfLines={1}>{jobRole(shift.job)}</ThemedText>}
                {missed && shift.missedNote ? (
                    <ThemedText variant="muted" size="xs" numberOfLines={1} style={{ marginTop: 4, fontStyle: 'italic' }}>{shift.missedNote}</ThemedText>
                ) : shift.notes ? (
                    <ThemedText variant="muted" size="xs" numberOfLines={1} style={{ marginTop: 4, fontStyle: 'italic' }}>{shift.notes}</ThemedText>
                ) : null}
            </View>

            <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
                <ThemedText size="sm" weight="medium" style={{ fontVariant: ['tabular-nums'], textDecorationLine: missed ? 'line-through' : 'none' }}>
                    {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                </ThemedText>
                <ThemedText variant="muted" size="xs">{formatDuration(minutes)}</ThemedText>
            </View>
        </PressableScale>
    );
}
