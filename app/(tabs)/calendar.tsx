import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { DayShifts } from '../../components/DayShifts';
import { MonthCalendar } from '../../components/MonthCalendar';
import { PeriodSummary, type SummaryPeriod } from '../../components/PeriodSummary';
import { PressableScale } from '../../components/ui/PressableScale';
import { LoadError } from '../../components/ui/LoadError';
import { Screen, useScreenTopInset } from '../../components/ui/Screen';
import { ThemedText } from '../../components/ui/ThemedText';
import { WeekDateStrip } from '../../components/WeekDateStrip';
import { radius, spacing } from '../../constants/themes';
import type { Shift } from '../../interfaces/shift.d';
import { withAlpha } from '../../lib/color';
import { getCalendarPeriod, getWeekDays, groupJobColorsByDate, toCalendarDateString, type CalendarView } from '../../lib/dateUtils';
import { addDays, startOfDay } from '../../lib/daySegments';
import { getMyShifts, getShiftsSummary } from '../../lib/shifts';
import { getIncomingShares } from '../../lib/shares';
import { useTheme } from '../../lib/theme-context';
import { useFetch } from '../../lib/useFetch';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useShiftsChanged } from '../../lib/shiftEvents';
import { useAuth } from '../../lib/auth-context';
import { featuresOf } from '../../lib/features';
import { IconButton, TextButton } from '../../components/ui/Button';


const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function CalendarScreen() {
    const { colors } = useTheme();
    const features = featuresOf(useAuth().user);
    const topInset = useScreenTopInset();
    const [mode, setMode] = useState<CalendarView>('month');
    const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
    const [now, setNow] = useState(() => new Date());
    const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('week');

    // Keeps "today"/"this week" right if the screen stays open past midnight
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    const period = getCalendarPeriod(mode, selectedDate);
    const startISO = period.start.toISOString();
    const endISO = period.end.toISOString();

    // One day back so an overnight shift that ends on the first day still shows up
    const shiftsQuery = useFetch(() => getMyShifts({ from: addDays(period.start, -1).toISOString(), to: endISO }), [startISO, endISO]);
    // The summary has its own week/month switch, independent of the calendar view.
    // The API's `to` is inclusive, so stop 1 ms before the next period starts.
    const summaryRange = getCalendarPeriod(summaryPeriod, selectedDate);
    const summaryFrom = summaryRange.start.toISOString();
    const summaryTo = new Date(summaryRange.end.getTime() - 1).toISOString();
    const summaryQuery = useFetch(() => getShiftsSummary({ from: summaryFrom, to: summaryTo }), [summaryFrom, summaryTo]);
    const shifts = shiftsQuery.data;

    const { refetch: refetchShifts } = shiftsQuery;
    const { refetch: refetchSummary } = summaryQuery;
    // People sharing their schedule with me — shown as chips above the calendar
    const incomingShares = useFetch(getIncomingShares);
    const { refetch: refetchIncoming } = incomingShares;

    useFocusEffect(useCallback(() => { refetchShifts(); refetchSummary(); refetchIncoming(); }, [refetchShifts, refetchSummary, refetchIncoming]));
    useShiftsChanged(() => { refetchShifts(); refetchSummary(); });

    const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

    const jobColorsByDate = useMemo(() => groupJobColorsByDate(shifts ?? []), [shifts]);

    const openShift = (shift: Shift) => router.push(`/edit-shift/${shift.id}`);
    const isThisWeek = weekDays.some((day) => toCalendarDateString(day.toISOString()) === toCalendarDateString(now.toISOString()));
    const isThisMonth = selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear();
    const summaryTitle = summaryPeriod === 'week'
        ? (isThisWeek ? 'This week' : `Week of ${shortDate(weekDays[0])}`)
        : (isThisMonth ? 'This month' : selectedDate.toLocaleDateString('en-US', { month: 'long' }));
    const summaryRangeLabel = summaryPeriod === 'week'
        ? `${shortDate(weekDays[0])} – ${shortDate(weekDays[6])}`
        : selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <Screen>
            <ScrollView
                contentContainerStyle={{ paddingTop: topInset, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
                refreshControl={
                    <RefreshControl
                        refreshing={shiftsQuery.isRefreshing}
                        onRefresh={() => { shiftsQuery.refresh(); summaryQuery.refetch(); }}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <ThemedText size="2xl" weight="bold">Calendar</ThemedText>
                    <View style={{ width: 160 }}>
                        <SegmentedControl
                            options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]}
                            value={mode}
                            onChange={setMode}
                            size="sm"
                            accessibilityLabel="Calendar view"
                        />
                    </View>
                </View>

                {/* Settings › Customize can hide it, like the web app's shared schedules on Home */}
                {features.sharedOnHome && !!incomingShares.data?.length && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
                        <ThemedText variant="muted" size="xs" weight="medium">SHARED WITH YOU</ThemedText>
                        {incomingShares.data.map((share) => (
                            <PressableScale
                                key={share.id}
                                onPress={() => router.push(`/shared/${share.owner.id}`)}
                                accessibilityRole="button"
                                accessibilityLabel={`See ${share.owner.name}’s shifts`}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 12, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.surface }}
                            >
                                <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.info, 0.15) }}>
                                    <ThemedText size="xs" weight="bold" color={colors.info}>{share.owner.name.charAt(0).toUpperCase()}</ThemedText>
                                </View>
                                <ThemedText size="sm" weight="medium">{share.owner.name.split(' ')[0]}</ThemedText>
                            </PressableScale>
                        ))}
                    </View>
                )}

                {mode === 'month' ? (
                    <MonthCalendar selectedDate={selectedDate} onSelect={setSelectedDate} jobColorsByDate={jobColorsByDate} />
                ) : (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                            <IconButton icon={ChevronLeft} appearance="plain" accessibilityLabel="Previous week" onPress={() => setSelectedDate((d) => addDays(d, -7))} />
                            <ThemedText weight="semibold" style={{ flex: 1, textAlign: 'center' }}>
                                {shortDate(weekDays[0])} – {shortDate(weekDays[6])}
                            </ThemedText>
                            {!isThisWeek && (
                                <TextButton label="Today" size="sm" onPress={() => setSelectedDate(startOfDay(new Date()))} style={{ paddingHorizontal: 8 }} />
                            )}
                            <IconButton icon={ChevronRight} appearance="plain" accessibilityLabel="Next week" onPress={() => setSelectedDate((d) => addDays(d, 7))} />
                        </View>
                        <WeekDateStrip days={weekDays} selectedDate={selectedDate} onSelect={setSelectedDate} jobColorsByDate={jobColorsByDate} />
                    </>
                )}

                <View style={{ marginTop: spacing.lg }}>
                    {shiftsQuery.isLoading && !shifts ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : shiftsQuery.error && !shifts ? (
                        <LoadError message={shiftsQuery.error} onRetry={() => { shiftsQuery.refresh(); summaryQuery.refetch(); }} />
                    ) : (
                        <>
                            <DayShifts day={selectedDate} shifts={shifts ?? []} onPressShift={openShift} />
                            {/* Settings › Customize can hide it */}
                            {features.calendarSummary && (
                                <View style={{ marginTop: spacing.lg }}>
                                    <PeriodSummary
                                        showPay={features.pay}
                                        period={summaryPeriod}
                                        onPeriodChange={setSummaryPeriod}
                                        title={summaryTitle}
                                        rangeLabel={summaryRangeLabel}
                                        summary={summaryQuery.data}
                                        isLoading={summaryQuery.isLoading}
                                    />
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </Screen>
    );
}
