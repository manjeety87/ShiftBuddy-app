import { router } from 'expo-router';
import { ClipboardCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '../constants/themes';
import { formatTime } from '../lib/dateUtils';
import { jobName } from '../lib/jobLabels';
import { motion } from '../lib/motion';
import { notify } from '../lib/notify';
import { formatDuration } from '../lib/shiftTime';
import { createTimeEntry, deleteTimeEntry, type UnloggedShift } from '../lib/timesheet';
import { useTheme } from '../lib/theme-context';
import { useFeatureToggle } from './FeatureSwitches';
import { TextButton } from './ui/Button';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday" or "Wed, Oct 22" */
const dayLabel = (iso: string) => {
    const day = new Date(iso);
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / DAY_MS);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * "Add your hours?" — shifts that ended without a clock-in or clock-out. Add saves
 * the scheduled hours with the usual break; tapping a row opens them to change
 * first; "Didn't go" marks it missed. Every finished shift ends up worked or missed.
 */
export function UnloggedHoursCard({ items }: { items: UnloggedShift[] }) {
    const { colors } = useTheme();
    const { toggle } = useFeatureToggle();
    const [adding, setAdding] = useState<string | null>(null);

    const add = async ({ shift, suggested }: UnloggedShift) => {
        setAdding(shift.id);
        try {
            const entry = await createTimeEntry({ shiftId: shift.id, clockIn: suggested.clockIn, clockOut: suggested.clockOut, breakMinutes: suggested.breakMinutes });
            notify.success(`Added ${formatDuration(suggested.paidMinutes)} at ${jobName(shift.job)}`, {
                action: { label: 'Undo', onPress: () => deleteTimeEntry(entry.id).catch(() => notify.error('Couldn’t undo — open your timesheet to fix it')) },
            });
        } catch (err: any) {
            notify.error('Couldn’t add the hours', { description: err?.response?.data?.message });
        } finally {
            setAdding(null);
        }
    };

    const alwaysAdd = async () => {
        await toggle('autoHours', true);
        notify.success('Your hours will be added after each shift', { description: 'Change it any time in Settings › Features.' });
    };

    return (
        <Animated.View entering={motion.appear} exiting={motion.disappear} layout={motion.layout} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                <ClipboardCheck color={colors.primary} size={20} />
                <View style={{ flex: 1 }}>
                    <ThemedText weight="semibold">{items.length === 1 ? 'Add your hours?' : `Add hours for ${items.length} shifts?`}</ThemedText>
                    <ThemedText variant="muted" size="xs">You didn’t clock in. These are your scheduled times.</ThemedText>
                </View>
            </View>

            {items.map((item) => {
                const { shift, suggested } = item;
                return (
                    <Animated.View key={shift.id} exiting={motion.disappear} layout={motion.layout} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.surfaceLight }}>
                        <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: shift.job.color }} />
                        <PressableScale
                            onPress={() => router.push(`/edit-time-entry/new?shiftId=${shift.id}`)}
                            accessibilityRole="button"
                            accessibilityHint="Opens the hours to change them first"
                            pressedScale={1}
                            pressedStyle={{ opacity: 0.6 }}
                            style={{ flex: 1 }}
                        >
                            <ThemedText weight="medium" numberOfLines={1}>{jobName(shift.job)}</ThemedText>
                            <ThemedText variant="secondary" size="xs" style={{ fontVariant: ['tabular-nums'] }}>
                                {dayLabel(shift.startTime)} · {formatTime(shift.startTime)} – {formatTime(shift.endTime)} · {formatDuration(suggested.paidMinutes)}
                            </ThemedText>
                        </PressableScale>
                        <TextButton label="Didn’t go" size="sm" weight="medium" color={colors.textSecondary} onPress={() => router.push(`/missed-shift/${shift.id}`)} />
                        <PressableScale
                            onPress={() => add(item)}
                            disabled={adding !== null}
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${formatDuration(suggested.paidMinutes)} at ${jobName(shift.job)}`}
                            style={{ minWidth: 56, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.primary }}
                        >
                            {adding === shift.id ? <ActivityIndicator color={colors.onPrimary} size="small" /> : <ThemedText size="sm" weight="semibold" color={colors.onPrimary}>Add</ThemedText>}
                        </PressableScale>
                    </Animated.View>
                );
            })}

            <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceLight, paddingTop: spacing.sm }}>
                <TextButton label="Always add my hours for me" size="sm" onPress={alwaysAdd} />
            </View>
        </Animated.View>
    );
}
