import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { PressableScale } from '../../components/ui/PressableScale';
import { SheetHeader } from '../../components/ui/SheetHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { MonthCalendar } from '../../components/MonthCalendar';
import { WeekDateStrip } from '../../components/WeekDateStrip';
import { radius, spacing } from '../../constants/themes';
import { formatTime, getCalendarPeriod, getWeekDays, groupJobColorsByDate, isSameDay, type CalendarView } from '../../lib/dateUtils';
import { addDays, startOfDay } from '../../lib/daySegments';
import { formatShareExpiry, getIncomingShares, getSharedShifts, stopSharing } from '../../lib/shares';
import { formatDuration } from '../../lib/shiftTime';
import { useTheme } from '../../lib/theme-context';
import { useFetch } from '../../lib/useFetch';
import { showAlert } from '../../lib/dialog';
import { jobName } from '../../lib/jobLabels';

const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Open the way it was shared: a week-long share as a week, anything longer as a month. */
const defaultViewFor = (expiresAt: string | null | undefined): CalendarView => (expiresAt && Date.parse(expiresAt) - Date.now() <= WEEK_MS ? 'week' : 'month');

/** Someone else's schedule, read-only (times and job names only), by week or by month. */
export default function SharedScheduleScreen() {
    const { colors } = useTheme();
    const { ownerId } = useLocalSearchParams<{ ownerId: string }>();
    const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

    const shares = useFetch(getIncomingShares);
    const share = shares.data?.find((s) => s.owner.id === ownerId);
    const [chosenView, setChosenView] = useState<CalendarView | null>(null);
    const view = chosenView ?? defaultViewFor(share?.expiresAt);

    const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
    const period = getCalendarPeriod(view, selectedDate);
    const fromISO = addDays(period.start, -1).toISOString(); // overnight shifts from the day before
    const toISO = period.end.toISOString();

    const schedule = useFetch(() => getSharedShifts(ownerId, fromISO, toISO), [ownerId, fromISO, toISO]);
    const ownerName = schedule.data?.owner.name ?? share?.owner.name ?? '';
    const firstName = ownerName.split(' ')[0];

    const jobColorsByDate = useMemo(() => groupJobColorsByDate(schedule.data?.shifts ?? []), [schedule.data]);

    const dayShifts = (schedule.data?.shifts ?? []).filter((s) => isSameDay(new Date(s.startTime), selectedDate));
    const isThisWeek = weekDays.some((day) => isSameDay(day, new Date()));

    const handleRemove = () => {
        if (!share) return;
        showAlert(`Stop seeing ${firstName}’s shifts?`, `${firstName} can share them with you again later.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await stopSharing(share.id);
                        router.back();
                    } catch {
                        showAlert('Couldn’t remove', 'Please try again.');
                    }
                },
            },
        ]);
    };

    const body = () => {
        if (schedule.isLoading && !schedule.data) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
        if (schedule.error && !schedule.data) {
            return (
                <View
                    style={{
                        alignItems: 'center',
                        paddingVertical: spacing.xl,
                        gap: spacing.sm,
                    }}
                >
                    <Eye color={colors.textMuted} size={36} />
                    <ThemedText weight="semibold">Not shared with you anymore</ThemedText>
                    <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center' }}>
                        The share may have expired or been stopped.
                    </ThemedText>
                </View>
            );
        }
        return (
            <>
                <View style={{ marginBottom: spacing.md }}>
                    <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setChosenView} size="sm" accessibilityLabel="Schedule view" />
                </View>

                {view === 'month' ? (
                    <MonthCalendar selectedDate={selectedDate} onSelect={setSelectedDate} jobColorsByDate={jobColorsByDate} />
                ) : (
                    <>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginBottom: spacing.sm,
                            }}
                        >
                            <PressableScale onPress={() => setSelectedDate((d) => addDays(d, -7))} hitSlop={10} accessibilityLabel="Previous week" style={{ padding: 4 }}>
                                <ChevronLeft color={colors.primary} size={22} />
                            </PressableScale>
                            <ThemedText weight="semibold" style={{ flex: 1, textAlign: 'center' }}>
                                {shortDate(weekDays[0])} – {shortDate(weekDays[6])}
                            </ThemedText>
                            {!isThisWeek && (
                                <PressableScale onPress={() => setSelectedDate(startOfDay(new Date()))} hitSlop={8} pressedScale={1} pressedStyle={{ opacity: 0.6 }} style={{ paddingHorizontal: 8 }}>
                                    <ThemedText size="sm" weight="semibold" color={colors.primary}>
                                        Today
                                    </ThemedText>
                                </PressableScale>
                            )}
                            <PressableScale onPress={() => setSelectedDate((d) => addDays(d, 7))} hitSlop={10} accessibilityLabel="Next week" style={{ padding: 4 }}>
                                <ChevronRight color={colors.primary} size={22} />
                            </PressableScale>
                        </View>

                        <WeekDateStrip days={weekDays} selectedDate={selectedDate} onSelect={setSelectedDate} jobColorsByDate={jobColorsByDate} />
                    </>
                )}

                <ThemedText size="lg" weight="bold" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
                    {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                    })}
                </ThemedText>
                {dayShifts.length === 0 ? (
                    <View
                        style={{
                            backgroundColor: colors.surface,
                            borderRadius: radius.md,
                            padding: spacing.md,
                        }}
                    >
                        <ThemedText variant="secondary" size="sm">
                            {firstName} isn’t working this day.
                        </ThemedText>
                    </View>
                ) : (
                    dayShifts.map((shift) => (
                        <View
                            key={shift.id}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.surface,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                marginBottom: spacing.sm,
                                borderLeftWidth: 4,
                                borderLeftColor: shift.job.color,
                            }}
                        >
                            <ThemedText weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                                {jobName(shift.job)}
                            </ThemedText>
                            <View style={{ alignItems: 'flex-end' }}>
                                <ThemedText size="sm" weight="medium" style={{ fontVariant: ['tabular-nums'] }}>
                                    {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                                </ThemedText>
                                <ThemedText variant="muted" size="xs">
                                    {formatDuration(Math.round((Date.parse(shift.endTime) - Date.parse(shift.startTime)) / 60000))}
                                </ThemedText>
                            </View>
                        </View>
                    ))
                )}

                {share && (
                    <>
                        <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.lg }}>
                            {firstName} is sharing with you · {formatShareExpiry(share.expiresAt, 'until they stop').replace(/^Until/, 'until')}
                        </ThemedText>
                        <PressableScale
                            onPress={handleRemove}
                            hitSlop={8}
                            pressedScale={1}
                            pressedStyle={{ opacity: 0.5 }}
                            style={{
                                alignSelf: 'center',
                                padding: spacing.sm,
                                marginTop: spacing.sm,
                            }}
                        >
                            <ThemedText size="sm" weight="medium" color={colors.danger}>
                                Remove from my list
                            </ThemedText>
                        </PressableScale>
                    </>
                )}
            </>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title={firstName ? `${firstName}’s shifts` : 'Shared shifts'} onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView
                contentContainerStyle={{
                    padding: spacing.lg,
                    paddingBottom: spacing.xl,
                }}
            >
                {body()}
            </ScrollView>
        </View>
    );
}
