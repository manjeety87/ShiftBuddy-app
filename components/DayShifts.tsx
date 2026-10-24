import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '../constants/themes';
import type { Shift } from '../interfaces/shift.d';
import { withAlpha } from '../lib/color';
import { formatTime, isSameDay, toCalendarDateString } from '../lib/dateUtils';
import { addDays, segmentsForDay, startOfDay } from '../lib/daySegments';
import { jobName, jobRole } from '../lib/jobLabels';
import { missedTag } from '../lib/missedShifts';
import { motion } from '../lib/motion';
import { formatDuration } from '../lib/shiftTime';
import { useTheme } from '../lib/theme-context';
import { useNow } from '../lib/useNow';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

interface DayShiftsProps {
    day: Date;
    shifts: Shift[];
    onPressShift: (shift: Shift) => void;
}

/** What an empty day says: today and days ahead invite adding a shift; a past day just states the fact. */
const emptyDayText = (day: Date, isPastDay: boolean, isToday: boolean) => {
    if (isPastDay) return { title: 'No shifts this day', hint: null };
    if (isToday) return { title: 'No shifts today', hint: 'A day off — or add one you picked up.' };
    return { title: `Nothing on ${day.toLocaleDateString('en-US', { weekday: 'long' })} yet`, hint: 'Got a shift that day? Add it here.' };
};

/** The shifts on one day, in order — with a one-tap "Add shift" on empty days. */
export function DayShifts({ day, shifts, onPressShift }: DayShiftsProps) {
    const { colors } = useTheme();
    const now = useNow();
    const segments = segmentsForDay(shifts, day);
    const isPastDay = addDays(startOfDay(day), 1).getTime() <= now;
    // The day's total is what will actually be worked: missed shifts stay listed but don't add up
    const counted = segments.filter((s) => !s.shift.missedReason);
    const workedMinutes = counted.reduce((sum, s) => sum + Math.round((s.end.getTime() - s.start.getTime()) / 60000), 0);
    const heading = day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const empty = emptyDayText(day, isPastDay, isSameDay(day, new Date(now)));

    return (
        // Re-keyed per day, so switching days fades the new list in
        <Animated.View key={day.toDateString()} entering={motion.swap}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <ThemedText size="lg" weight="bold">{heading}</ThemedText>
                {counted.length > 0 && (
                    <ThemedText variant="secondary" size="sm">
                        {counted.length} shift{counted.length === 1 ? '' : 's'} · {formatDuration(workedMinutes)}
                    </ThemedText>
                )}
            </View>

            {segments.length === 0 ? (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                        <ThemedText size="sm" weight="semibold">{empty.title}</ThemedText>
                        {empty.hint && <ThemedText variant="muted" size="xs">{empty.hint}</ThemedText>}
                    </View>
                    {!isPastDay && (
                        <PressableScale
                            onPress={() => router.push(`/create-shift?date=${toCalendarDateString(day.toISOString())}`)}
                            hitSlop={8}
                            accessibilityRole="button"
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} pressedStyle={{ opacity: 0.6 }} pressedScale={1}
                        >
                            <Plus color={colors.primary} size={16} />
                            <ThemedText size="sm" weight="semibold" color={colors.primary}>Add shift</ThemedText>
                        </PressableScale>
                    )}
                </View>
            ) : (
                segments.map(({ shift, continuesFromPreviousDay, continuesToNextDay }) => {
                    const isNow = Date.parse(shift.startTime) <= now && Date.parse(shift.endTime) > now;
                    const missed = shift.missedReason;
                    return (
                        <PressableScale
                            key={shift.id}
                            onPress={() => onPressShift(shift)}
                            accessibilityRole="button"
                            pressedScale={0.98}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: shift.job.color, opacity: missed ? 0.65 : 1 }}
                        >
                            <View style={{ flex: 1 }}>
                                <ThemedText weight="semibold" numberOfLines={1}>{jobName(shift.job)}</ThemedText>
                                {!!jobRole(shift.job) && <ThemedText variant="secondary" size="sm" numberOfLines={1}>{jobRole(shift.job)}</ThemedText>}
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <ThemedText size="sm" weight="medium" style={{ textDecorationLine: missed ? 'line-through' : 'none' }}>
                                    {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                                </ThemedText>
                                {missed ? (
                                    <ThemedText variant="secondary" size="xs" weight="semibold">{missedTag(missed)}</ThemedText>
                                ) : isNow ? (
                                    <View style={{ marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: withAlpha(colors.success, 0.15) }}>
                                        <ThemedText size="xs" weight="semibold" color={colors.success}>Now</ThemedText>
                                    </View>
                                ) : (continuesFromPreviousDay || continuesToNextDay) ? (
                                    <ThemedText variant="muted" size="xs">{continuesFromPreviousDay ? 'from yesterday' : 'ends tomorrow'}</ThemedText>
                                ) : null}
                            </View>
                        </PressableScale>
                    );
                })
            )}
        </Animated.View>
    );
}
