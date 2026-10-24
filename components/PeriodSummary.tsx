import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import type { PaySummary } from '../interfaces/summary';
import { useTheme } from '../lib/theme-context';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';
import { SegmentedControl } from './ui/SegmentedControl';
import Animated from 'react-native-reanimated';
import { motion } from '../lib/motion';

export type SummaryPeriod = 'week' | 'month';

interface PeriodSummaryProps {
    period: SummaryPeriod;
    onPeriodChange: (period: SummaryPeriod) => void;
    /** e.g. "This week", "Week of Sep 27", "October" */
    title: string;
    /** e.g. "Oct 4 – 10" or "October 2026" */
    rangeLabel: string;
    summary: PaySummary | null;
    isLoading: boolean;
    /** Pay estimates switched on (Settings › Features): otherwise only hours */
    showPay: boolean;
}

const formatHours = (hours: number) => `${Math.round(hours * 10) / 10}h`;
const formatMoney = (amount: number) => `$${Math.round(amount).toLocaleString('en-US')}`;

/** At-a-glance totals for the selected week or month: hours, shifts, estimated pay, and how they split across jobs. */
export function PeriodSummary({ period, onPeriodChange, title, rangeLabel, summary, isLoading, showPay }: PeriodSummaryProps) {
    const { colors } = useTheme();
    const byJob = [...(summary?.byJob ?? [])].sort((a, b) => b.hours - a.hours);
    const totalHours = summary?.totalHours ?? 0;
    const hasPay = showPay && (summary?.totalGrossPay ?? 0) > 0;
    const someJobsHaveNoRate = byJob.some((job) => !job.hourlyRate);

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
            {/* Title + Week/Month */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                    <ThemedText weight="bold">{title}</ThemedText>
                    <ThemedText variant="muted" size="xs">{rangeLabel}</ThemedText>
                </View>
                <View style={{ width: 130 }}>
                    <SegmentedControl
                        options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
                        value={period}
                        onChange={onPeriodChange}
                        size="sm"
                        accessibilityLabel="Summary period"
                    />
                </View>
            </View>

            <Animated.View key={`${period}-${rangeLabel}`} entering={motion.swap}>
                {isLoading && !summary ? (
                    <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
                ) : (summary?.shiftCount ?? 0) === 0 ? (
                    <ThemedText variant="secondary" size="sm" style={{ paddingVertical: spacing.sm }}>
                        No shifts in this {period} yet.
                    </ThemedText>
                ) : (
                    <>
                        {/* Headline numbers */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md }}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={{ fontSize: 34, lineHeight: 38, fontVariant: ['tabular-nums'] }} weight="bold">{formatHours(totalHours)}</ThemedText>
                                <ThemedText variant="muted" size="xs">worked across {summary!.shiftCount} shift{summary!.shiftCount === 1 ? '' : 's'}</ThemedText>
                            </View>
                            {hasPay && (
                                <View style={{ alignItems: 'flex-end' }}>
                                    <ThemedText size="xl" weight="bold" color={colors.success}>{formatMoney(summary!.totalGrossPay)}</ThemedText>
                                    <ThemedText variant="muted" size="xs">est. before tax</ThemedText>
                                </View>
                            )}
                        </View>

                        {/* How the hours split across jobs */}
                        <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: spacing.md }}>
                            {byJob.map((job) => (
                                <View key={job.jobId} style={{ flex: job.hours, backgroundColor: job.color }} />
                            ))}
                        </View>

                        {byJob.map((job) => (
                            <View key={job.jobId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: job.color }} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText size="sm" weight="medium" numberOfLines={1}>{job.jobTitle}</ThemedText>
                                    <ThemedText variant="muted" size="xs">{job.shiftCount} shift{job.shiftCount === 1 ? '' : 's'}</ThemedText>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <ThemedText size="sm" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>{formatHours(job.hours)}</ThemedText>
                                    {showPay && <ThemedText variant="muted" size="xs">{job.hourlyRate ? formatMoney(job.grossPay) : 'no rate'}</ThemedText>}
                                </View>
                            </View>
                        ))}

                        {showPay && (
                            <>
                                <View style={{ height: 1, backgroundColor: colors.surfaceLight, marginVertical: spacing.sm }} />
                                <PressableScale
                                    onPress={() => router.push(someJobsHaveNoRate ? '/(tabs)/jobs' : '/pay-summary')}
                                    accessibilityRole="button"
                                    pressedScale={1}
                                    pressedStyle={{ opacity: 0.6 }}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4 }}
                                >
                                    <ThemedText size="sm" weight="medium" color={colors.primary} style={{ flex: 1 }}>
                                        {someJobsHaveNoRate ? 'Add hourly rates to see your pay' : 'Pay details'}
                                    </ThemedText>
                                    <ChevronRight color={colors.primary} size={16} />
                                </PressableScale>
                            </>
                        )}
                    </>
                )}
            </Animated.View>
        </View>
    );
}
