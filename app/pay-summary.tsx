import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { IconButton, TextButton } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { LoadError } from '../components/ui/LoadError';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { JobSummary } from '../interfaces/summary';
import { getWeekDays } from '../lib/dateUtils';
import { addDays, startOfDay } from '../lib/daySegments';
import { jobName, jobRole } from '../lib/jobLabels';
import { useJobsChanged } from '../lib/jobs';
import { motion } from '../lib/motion';
import { useShiftsChanged } from '../lib/shiftEvents';
import { getShiftsSummary } from '../lib/shifts';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';

type Period = 'week' | 'biweekly' | 'month';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'biweekly', label: '2 Weeks' },
    { value: 'month', label: 'Month' },
];

/**
 * Real calendar periods (not "the last N days"), so upcoming shifts count too:
 * a week starts on Sunday like the calendar; "2 weeks" is this week + next — a
 * typical biweekly pay period; a month is the calendar month. `offset` steps back/forward.
 */
const periodRange = (period: Period, offset: number) => {
    const today = startOfDay(new Date());
    if (period === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1) };
    }
    const days = period === 'week' ? 7 : 14;
    const start = addDays(getWeekDays(today)[0], offset * days);
    return { start, end: addDays(start, days) };
};

const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const rangeLabel = (period: Period, start: Date, end: Date) =>
    period === 'month' ? start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${shortDate(start)} – ${shortDate(addDays(end, -1))}`;
const money = (value: number) => `$${value.toFixed(2)}`;
const hours = (value: number) => `${Math.round(value * 10) / 10}h`;
const nameOf = (job: JobSummary) => ({ title: job.jobTitle, companyName: job.companyName });

export default function PaySummaryScreen() {
    const { colors } = useTheme();
    const [period, setPeriod] = useState<Period>('biweekly');
    const [offset, setOffset] = useState(0);

    const { start, end } = periodRange(period, offset);
    const fromISO = start.toISOString();
    const toISO = new Date(end.getTime() - 1).toISOString(); // the API's `to` is inclusive
    const summary = useFetch(() => getShiftsSummary({ from: fromISO, to: toISO }), [fromISO, toISO]);
    // A shift added, or an hourly rate set, elsewhere shows up here straight away
    useShiftsChanged(summary.refetch);
    useJobsChanged(summary.refetch);

    const changePeriod = (next: Period) => {
        setPeriod(next);
        setOffset(0);
    };

    const data = summary.data;
    const jobsWithoutRate = data?.byJob.filter((job) => !job.hourlyRate) ?? [];
    const workedShare = data && data.totalHours > 0 ? data.completedHours / data.totalHours : 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Pay Summary" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
                refreshControl={<RefreshControl refreshing={summary.isRefreshing} onRefresh={summary.refresh} tintColor={colors.primary} />}
            >
                <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={changePeriod} accessibilityLabel="Pay period" />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md }}>
                    <IconButton icon={ChevronLeft} appearance="plain" accessibilityLabel="Previous period" onPress={() => setOffset((n) => n - 1)} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <ThemedText weight="semibold">{rangeLabel(period, start, end)}</ThemedText>
                        {offset !== 0 && <TextButton label="Back to now" size="xs" onPress={() => setOffset(0)} />}
                    </View>
                    <IconButton icon={ChevronRight} appearance="plain" accessibilityLabel="Next period" onPress={() => setOffset((n) => n + 1)} />
                </View>

                {summary.isLoading && !data ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : summary.error && !data ? (
                    <LoadError message={summary.error} onRetry={summary.refresh} />
                ) : data ? (
                    <Animated.View key={`${period}-${offset}`} entering={motion.swap}>
                        {/* Hours: the total, and how much of it is already done */}
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                            <ThemedText variant="secondary" size="sm">Total hours</ThemedText>
                            <ThemedText weight="bold" style={{ fontSize: 34, lineHeight: 40, fontVariant: ['tabular-nums'] }}>{hours(data.totalHours)}</ThemedText>
                            <ThemedText variant="muted" size="xs" style={{ marginBottom: spacing.sm }}>
                                {data.shiftCount} shift{data.shiftCount === 1 ? '' : 's'}
                            </ThemedText>
                            {data.totalHours > 0 && (
                                <>
                                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceLight, overflow: 'hidden' }}>
                                        <View style={{ width: `${Math.round(workedShare * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: colors.primary }} />
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                        <ThemedText size="xs" weight="medium" color={colors.primary}>{hours(data.completedHours)} worked</ThemedText>
                                        <ThemedText size="xs" variant="secondary">{hours(data.upcomingHours)} still scheduled</ThemedText>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Pay — only jobs with an hourly rate can be counted */}
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <ThemedText variant="secondary">Gross pay</ThemedText>
                                <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{money(data.totalGrossPay)}</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <ThemedText variant="secondary">Est. take-home</ThemedText>
                                    <TextButton label={`−${data.taxDeductionPercent}%`} size="xs" onPress={() => router.push('/tax-settings')} accessibilityLabel="Change the tax estimate" />
                                </View>
                                <ThemedText weight="bold" color={colors.success} style={{ fontVariant: ['tabular-nums'] }}>{money(data.totalNetPay)}</ThemedText>
                            </View>
                            {jobsWithoutRate.length > 0 && (
                                <ThemedText variant="muted" size="xs" style={{ lineHeight: 16 }}>
                                    {jobsWithoutRate.length === data.byJob.length
                                        ? 'Add an hourly rate to your jobs to see pay.'
                                        : `Doesn’t include ${jobsWithoutRate.map((job) => jobName(nameOf(job))).join(', ')} — no hourly rate yet.`}
                                </ThemedText>
                            )}
                        </View>

                        <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>BY JOB</ThemedText>
                        {data.byJob.length === 0 ? (
                            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
                                <ThemedText variant="secondary" size="sm">No shifts in this period.</ThemedText>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                                {[...data.byJob].sort((a, b) => b.hours - a.hours).map((job, i) => (
                                    <JobRow key={job.jobId} job={job} isFirst={i === 0} />
                                ))}
                            </View>
                        )}
                    </Animated.View>
                ) : null}
            </ScrollView>
        </View>
    );
}

function JobRow({ job, isFirst }: { job: JobSummary; isFirst: boolean }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: isFirst ? 0 : 1, borderTopColor: colors.surfaceLight }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: job.color }} />
            <View style={{ flex: 1 }}>
                <ThemedText weight="semibold" numberOfLines={1}>{jobName(nameOf(job))}</ThemedText>
                <ThemedText variant="muted" size="xs" numberOfLines={1}>
                    {[jobRole(nameOf(job)), `${job.shiftCount} shift${job.shiftCount === 1 ? '' : 's'}`, hours(job.hours)].filter(Boolean).join(' · ')}
                </ThemedText>
            </View>
            {job.hourlyRate ? (
                <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{money(job.grossPay)}</ThemedText>
                    <ThemedText variant="muted" size="xs">{money(job.hourlyRate)}/h</ThemedText>
                </View>
            ) : (
                <TextButton label="Add rate" size="sm" onPress={() => router.push(`/edit-job/${job.jobId}`)} />
            )}
        </View>
    );
}
