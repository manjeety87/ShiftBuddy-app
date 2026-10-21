import { router } from 'expo-router';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import type { Shift } from '../interfaces/shift.d';
import { formatTime } from '../lib/dateUtils';
import { formatDuration } from '../lib/shiftTime';
import { useTheme } from '../lib/theme-context';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

const MINUTE_MS = 60 * 1000;

/**
 * The timesheet side of a shift: the hours clocked for it (tap to change them),
 * or — when nothing was clocked — a way to add them.
 *
 * `attached` hangs it under the shift's card in a list (draw that card with
 * `hasFooter`); lists show it only for shifts that have hours, so a page of past
 * shifts isn't a page of "Add hours" buttons. Without it, it's a row of its own
 * (Edit Shift), where adding hours is offered.
 */
export function ShiftHoursRow({ shift, attached = false }: { shift: Pick<Shift, 'id' | 'timeEntries' | 'job'>; attached?: boolean }) {
    const { colors } = useTheme();
    const entry = shift.timeEntries?.[0] ?? null;

    const open = () => router.push(entry ? `/edit-time-entry/${entry.id}` : `/edit-time-entry/new?shiftId=${shift.id}`);

    const content = () => {
        if (!entry) {
            return (
                <>
                    <Plus color={colors.primary} size={16} />
                    <ThemedText size="sm" weight="medium" color={colors.primary} style={{ flex: 1 }}>Add the hours you worked</ThemedText>
                </>
            );
        }
        if (!entry.clockOut) {
            return (
                <>
                    <ClipboardList color={colors.warning} size={16} />
                    <ThemedText size="sm" weight="medium" color={colors.warning} style={{ flex: 1 }}>Still clocked in — set when you finished</ThemedText>
                </>
            );
        }
        const paidMinutes = Math.max(0, Math.round((Date.parse(entry.clockOut) - Date.parse(entry.clockIn)) / MINUTE_MS) - entry.breakMinutes);
        return (
            <>
                <ClipboardList color={colors.textSecondary} size={16} />
                <ThemedText variant="secondary" size="sm" style={{ flex: 1 }} numberOfLines={1}>
                    Worked {formatTime(entry.clockIn)} – {formatTime(entry.clockOut)}
                    {entry.breakMinutes > 0 ? ` · ${entry.breakMinutes} min break` : ''}
                </ThemedText>
                <ThemedText size="sm" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(paidMinutes)}</ThemedText>
            </>
        );
    };

    return (
        <PressableScale
            onPress={open}
            accessibilityRole="button"
            accessibilityHint={entry ? 'Opens these hours to change them' : 'Adds hours for this shift'}
            pressedScale={1}
            pressedStyle={{ backgroundColor: colors.surfaceLight }}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                backgroundColor: colors.surface,
                ...(attached
                    ? {
                        minHeight: 44,
                        marginBottom: spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: colors.surfaceLight,
                        borderBottomLeftRadius: radius.md,
                        borderBottomRightRadius: radius.md,
                        // Continues the card's job-colour stripe
                        borderLeftWidth: 4,
                        borderLeftColor: shift.job.color,
                    }
                    : { minHeight: 52, borderRadius: radius.lg }),
            }}
        >
            {content()}
            <View>
                <ChevronRight color={colors.textMuted} size={16} />
            </View>
        </PressableScale>
    );
}
