import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Layers, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button, IconButton, TextButton } from '../components/ui/Button';
import { LoadError } from '../components/ui/LoadError';
import { PressableScale } from '../components/ui/PressableScale';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { Job } from '../interfaces/job.d';
import { formatTime } from '../lib/dateUtils';
import { jobName, jobRole } from '../lib/jobLabels';
import { formatDuration } from '../lib/shiftTime';
import { useTheme } from '../lib/theme-context';
import { formatCalendarDay, getHoursSummary, getTimesheet, useTimesheetChanged, type HoursSummary, type SummaryRange, type Timesheet, type TimesheetEntry } from '../lib/timesheet';
import { useFetch } from '../lib/useFetch';
import { useMyJobs } from '../lib/useMyJobs';
import { useAuth } from '../lib/auth-context';
import { featuresOf } from '../lib/features';

/** What the screen is showing: every job together for a range, or one job by its pay period. */
type Selection = 'all' | string;
type Sheet = ({ kind: 'all' } & HoursSummary) | ({ kind: 'job' } & Timesheet);

const RANGES: { value: SummaryRange; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'twoWeeks', label: '2 Weeks' },
    { value: 'month', label: 'Month' },
    { value: 'all', label: 'All time' },
];
const RANGE_NAMES: Record<Exclude<SummaryRange, 'all'>, { current: string; previous: string; plain: string }> = {
    week: { current: 'This week', previous: 'Last week', plain: 'Sunday to Saturday' },
    twoWeeks: { current: 'This week and last', previous: 'The two weeks before', plain: 'Two weeks' },
    month: { current: 'This month', previous: 'Last month', plain: 'Calendar month' },
};

const money = (value: number) => `$${value.toFixed(2)}`;
const entryDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Hours actually worked, and what they earned — all jobs for a week, two weeks, a month or all time, or one job for a pay period: `/timesheet?jobId=` (jobId optional). */
export default function TimesheetScreen() {
    const { colors } = useTheme();
    const features = featuresOf(useAuth().user);
    const params = useLocalSearchParams<{ jobId?: string }>();
    const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useMyJobs();
    const [chosen, setChosen] = useState<Selection | null>(params.jobId ?? null);
    const [offset, setOffset] = useState(0);
    const [range, setRange] = useState<SummaryRange>('week');
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // With one job "all jobs" would say the same thing twice, so that job's pay period is the starting view
    const selection: Selection | null = chosen ?? (jobs ? (jobs.length === 1 ? jobs[0].id : 'all') : null);
    const selectedJob = selection && selection !== 'all' ? jobs?.find((job) => job.id === selection) ?? null : null;

    const sheet = useFetch<Sheet | null>(async () => {
        if (!selection || !jobs?.length) return null;
        return selection === 'all' ? { kind: 'all', ...(await getHoursSummary(range, offset)) } : { kind: 'job', ...(await getTimesheet(selection, offset)) };
    }, [selection, range, offset, jobs?.length]);
    useTimesheetChanged(sheet.refetch);

    const choose = (next: Selection) => {
        setChosen(next);
        setOffset(0); // a job's pay period and a calendar week don't line up
        setIsPickerOpen(false);
    };

    const card = { backgroundColor: colors.surface, borderRadius: radius.lg };
    const addHours = () => router.push(selectedJob ? `/edit-time-entry/new?jobId=${selectedJob.id}` : '/edit-time-entry/new');

    const pickerRow = (key: string, isSelected: boolean, onPress: () => void, mark: React.ReactNode, title: string, detail: string | null) => (
        <PressableScale
            key={key}
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            pressedScale={1}
            pressedStyle={{ backgroundColor: colors.surfaceLight }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.md }}
        >
            {mark}
            <View style={{ flex: 1 }}>
                <ThemedText weight={isSelected ? 'semibold' : 'normal'} numberOfLines={1}>{title}</ThemedText>
                {!!detail && <ThemedText variant="secondary" size="xs" numberOfLines={1}>{detail}</ThemedText>}
            </View>
            {isSelected && <Check color={colors.primary} size={20} strokeWidth={2.5} />}
        </PressableScale>
    );

    const jobDot = (job: Pick<Job, 'color'>) => <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: job.color }} />;

    const entryRow = (entry: TimesheetEntry & { job?: Job }, isFirst: boolean) => (
        <PressableScale
            key={entry.id}
            onPress={() => router.push(`/edit-time-entry/${entry.id}`)}
            accessibilityRole="button"
            accessibilityHint="Opens this entry to change it"
            pressedScale={1}
            pressedStyle={{ backgroundColor: colors.surfaceLight }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: isFirst ? 0 : 1, borderTopColor: colors.surfaceLight }}
        >
            {entry.job && jobDot(entry.job)}
            <View style={{ flex: 1 }}>
                <ThemedText weight="semibold" numberOfLines={1}>{entry.job ? `${jobName(entry.job)} · ${entryDay(entry.clockIn)}` : entryDay(entry.clockIn)}</ThemedText>
                <ThemedText variant="secondary" size="sm">
                    {formatTime(entry.clockIn)} – {entry.clockOut ? formatTime(entry.clockOut) : 'still working'}
                    {entry.breakMinutes > 0 ? ` · ${entry.breakMinutes} min break` : ''}
                    {entry.isAutomatic ? ' · added for you' : ''}
                </ThemedText>
            </View>
            {entry.paidMinutes === null ? (
                <ThemedText size="sm" weight="semibold" color={colors.success}>On the clock</ThemedText>
            ) : (
                <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(entry.paidMinutes)}</ThemedText>
            )}
            <ChevronRight color={colors.textMuted} size={16} />
        </PressableScale>
    );

    const results = (data: Sheet) => {
        const isAll = data.kind === 'all';
        const isAllTime = isAll && data.range === 'all';
        const names = isAll && data.range !== 'all' ? RANGE_NAMES[data.range] : null;
        const tax = data.taxDeductionPercent;
        // With pay estimates switched off (Settings › Features) the timesheet is hours only
        const showPay = features.pay;
        const grossPay = showPay ? data.totals.grossPay : null;
        const estimatedPay = showPay ? (data.totals.estimatedPay ?? null) : null;
        const periodTitle = !data.period.start
            ? 'All time'
            : isAllTime
                ? `Since ${formatCalendarDay(data.period.start, { month: 'short', day: 'numeric', year: 'numeric' })}`
                : isAll && data.range === 'month'
                    ? formatCalendarDay(data.period.start, { month: 'long', year: 'numeric' })
                    : `${formatCalendarDay(data.period.start)} – ${formatCalendarDay(data.period.end ?? data.period.start)}`;
        const periodNote = isAllTime
            ? 'Every hour you’ve recorded'
            : names
            ? offset === 0 ? names.current : offset === -1 ? names.previous : names.plain
            : data.kind === 'job' && data.period.payday
                ? `Paid ${formatCalendarDay(data.period.payday, { weekday: 'short', month: 'short', day: 'numeric' })}`
                : 'Pay period by calendar weeks';

        return (
            <>
                {isAll && (
                    <View style={{ marginBottom: spacing.md }}>
                        <SegmentedControl
                            options={RANGES}
                            value={range}
                            onChange={(next) => {
                                setRange(next);
                                setOffset(0);
                            }}
                            accessibilityLabel="Show hours for"
                        />
                    </View>
                )}

                {isAllTime ? (
                    <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                        <ThemedText weight="semibold">{periodTitle}</ThemedText>
                        <ThemedText variant="muted" size="xs">{periodNote}</ThemedText>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                        <IconButton icon={ChevronLeft} appearance="plain" accessibilityLabel={isAll ? 'Earlier' : 'Previous pay period'} onPress={() => setOffset((n) => n - 1)} />
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <ThemedText weight="semibold">{periodTitle}</ThemedText>
                            <ThemedText variant="muted" size="xs">{periodNote}</ThemedText>
                            {offset !== 0 && <TextButton label={isAll ? 'Back to now' : 'Back to this period'} size="xs" onPress={() => setOffset(0)} />}
                        </View>
                        <IconButton icon={ChevronRight} appearance="plain" accessibilityLabel={isAll ? 'Later' : 'Next pay period'} onPress={() => setOffset((n) => n + 1)} disabled={offset >= 0} style={{ opacity: offset >= 0 ? 0.3 : 1 }} />
                    </View>
                )}

                <View style={{ ...card, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'flex-end' }}>
                    <View style={{ flex: 1 }}>
                        <ThemedText variant="secondary" size="sm">{isAll ? 'Hours worked' : 'Hours to be paid'}</ThemedText>
                        <ThemedText weight="bold" style={{ fontSize: 34, lineHeight: 40, fontVariant: ['tabular-nums'] }}>{formatDuration(data.totals.paidMinutes)}</ThemedText>
                        <ThemedText variant="muted" size="xs">
                            {plural(data.totals.entryCount, 'shift')}
                            {data.totals.breakMinutes > 0 ? ` · ${formatDuration(data.totals.breakMinutes)} unpaid breaks taken off` : ''}
                        </ThemedText>
                    </View>
                    {grossPay !== null ? (
                        <View style={{ alignItems: 'flex-end' }}>
                            <ThemedText size="xl" weight="bold" color={colors.success} style={{ fontVariant: ['tabular-nums'] }}>{money(grossPay)}</ThemedText>
                            <ThemedText variant="muted" size="xs">gross</ThemedText>
                            {estimatedPay !== null && (
                                <ThemedText size="sm" weight="semibold" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>
                                    {money(estimatedPay)} <ThemedText variant="muted" size="xs">est. after {tax}%</ThemedText>
                                </ThemedText>
                            )}
                        </View>
                    ) : !isAll && showPay ? (
                        <TextButton label="Add hourly rate" size="sm" onPress={() => router.push(`/edit-job/${data.job.id}`)} />
                    ) : null}
                </View>

                {isAll && data.byJob.length > 0 && (
                    <>
                        <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>BY JOB</ThemedText>
                        <View style={{ ...card, overflow: 'hidden', marginBottom: spacing.lg }}>
                            {data.byJob.map((line, i) => (
                                <PressableScale
                                    key={line.job.id}
                                    onPress={() => choose(line.job.id)}
                                    accessibilityRole="button"
                                    accessibilityHint="Shows this job’s pay period"
                                    pressedScale={1}
                                    pressedStyle={{ backgroundColor: colors.surfaceLight }}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}
                                >
                                    {jobDot(line.job)}
                                    <View style={{ flex: 1 }}>
                                        <ThemedText weight="semibold" numberOfLines={1}>{jobName(line.job)}</ThemedText>
                                        <ThemedText variant="muted" size="xs">{plural(line.entryCount, 'shift')}{showPay && line.grossPay === null ? ' · no hourly rate' : ''}</ThemedText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(line.paidMinutes)}</ThemedText>
                                        {showPay && line.grossPay !== null && (
                                            <ThemedText variant="muted" size="xs" style={{ fontVariant: ['tabular-nums'] }}>
                                                {money(line.grossPay)}{line.estimatedPay !== null ? ` · est. ${money(line.estimatedPay)}` : ''}
                                            </ThemedText>
                                        )}
                                    </View>
                                    <ChevronRight color={colors.textMuted} size={16} />
                                </PressableScale>
                            ))}
                        </View>
                        {data.totals.missingRates && grossPay !== null && (
                            <ThemedText variant="muted" size="xs" style={{ marginTop: -spacing.md, marginBottom: spacing.lg, marginLeft: 4 }}>The pay figure leaves out jobs without an hourly rate.</ThemedText>
                        )}
                    </>
                )}

                {!isAll && !data.job.payday && (
                    <PressableScale
                        onPress={() => router.push(`/edit-job/${data.job.id}`)}
                        accessibilityRole="button"
                        pressedScale={0.98}
                        style={{ ...card, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                    >
                        <ThemedText size="sm" style={{ flex: 1 }}>
                            Tell us a payday for {jobName(data.job)} and these periods will match your pay stubs. <ThemedText size="sm" weight="medium" color={colors.primary}>Set payday</ThemedText>
                        </ThemedText>
                        <ChevronRight color={colors.primary} size={16} />
                    </PressableScale>
                )}

                {estimatedPay !== null && (
                    <PressableScale onPress={() => router.push('/tax-settings')} accessibilityRole="button" pressedScale={0.98} style={{ marginTop: isAll && data.byJob.length > 0 ? -spacing.sm : 0, marginBottom: spacing.lg, marginLeft: 4 }}>
                        <ThemedText variant="muted" size="xs">
                            Est. pay is gross less your {tax}% deduction estimate. <ThemedText size="xs" weight="medium" color={colors.primary}>Change it</ThemedText>
                        </ThemedText>
                    </PressableScale>
                )}

                {!isAllTime && (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, marginLeft: 4 }}>
                            <ThemedText variant="secondary" size="sm" weight="semibold" style={{ flex: 1 }}>CLOCKED SHIFTS</ThemedText>
                            <TextButton label="Add hours" icon={Plus} size="sm" onPress={addHours} />
                        </View>
                        {data.entries.length === 0 ? (
                            <View style={{ ...card, padding: spacing.md }}>
                                <ThemedText weight="semibold" size="sm">Nothing clocked {isAll ? 'in these days' : 'in this period'}</ThemedText>
                                <ThemedText variant="muted" size="xs">Clock in from Home when a shift starts, or add hours you already worked.</ThemedText>
                            </View>
                        ) : (
                            <View style={{ ...card, overflow: 'hidden' }}>{data.entries.map((entry, i) => entryRow(entry, i === 0))}</View>
                        )}
                    </>
                )}

                <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.md, lineHeight: 16 }}>
                    A 30-minute unpaid break is taken off shifts longer than 5 hours. Tap a shift to change its times or break.
                </ThemedText>
            </>
        );
    };

    const body = () => {
        if (jobsLoading && !jobs) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
        if (jobsError && !jobs) return <LoadError message={jobsError} onRetry={refetchJobs} />;
        if (!jobs?.length) {
            return (
                <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
                    <ClipboardList color={colors.textMuted} size={40} />
                    <ThemedText weight="semibold">No jobs yet</ThemedText>
                    <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center', marginBottom: spacing.sm }}>Add where you work, then clock in from Home when your shift starts.</ThemedText>
                    <Button label="Add a Job" onPress={() => router.push('/create-job')} style={{ alignSelf: 'stretch' }} />
                </View>
            );
        }

        return (
            <>
                {/* One row that says whose hours these are; the choices open in a drawer, like the job field on a shift */}
                {jobs.length > 0 && (
                    <PressableScale
                        onPress={() => setIsPickerOpen(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Showing ${selectedJob ? jobName(selectedJob) : 'all jobs'}. Change`}
                        pressedScale={0.98}
                        style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.md }}
                    >
                        {selectedJob ? jobDot(selectedJob) : <Layers color={colors.primary} size={18} />}
                        <View style={{ flex: 1 }}>
                            <ThemedText weight="semibold" numberOfLines={1}>{selectedJob ? jobName(selectedJob) : 'All jobs'}</ThemedText>
                            <ThemedText variant="muted" size="xs">{selectedJob ? 'By pay period' : 'Every job together — week, month or all time'}</ThemedText>
                        </View>
                        <ChevronDown color={colors.textSecondary} size={18} />
                    </PressableScale>
                )}

                {sheet.isLoading && !sheet.data ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : sheet.error && !sheet.data ? (
                    <LoadError message={sheet.error} onRetry={sheet.refresh} />
                ) : sheet.data ? (
                    results(sheet.data)
                ) : null}
            </>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Timesheet" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
                refreshControl={<RefreshControl refreshing={sheet.isRefreshing} onRefresh={sheet.refresh} tintColor={colors.primary} />}
            >
                {body()}
            </ScrollView>

            <BottomSheet visible={isPickerOpen} onClose={() => setIsPickerOpen(false)} header={<ThemedText weight="semibold">Show hours for</ThemedText>}>
                <ScrollView accessibilityRole="radiogroup" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                    {pickerRow('all', selection === 'all', () => choose('all'), <Layers color={colors.primary} size={18} />, 'All jobs', 'Every job together — week, month or all time')}
                    {jobs?.map((job) => pickerRow(job.id, selection === job.id, () => choose(job.id), jobDot(job), jobName(job), jobRole(job) || null))}
                </ScrollView>
            </BottomSheet>
        </View>
    );
}
