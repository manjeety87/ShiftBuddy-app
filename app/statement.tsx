import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { DateTimeField } from '../components/DateTimeField';
import { PressableScale } from '../components/ui/PressableScale';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { toCalendarDateString } from '../lib/dateUtils';
import { jobName, jobRole } from '../lib/jobLabels';
import { notify } from '../lib/notify';
import { shareStatement } from '../lib/shareStatement';
import type { StatementRange, StatementRequest } from '../lib/shifts';
import { useMyJobs } from '../lib/useMyJobs';
import { useTheme } from '../lib/theme-context';

type Choice = StatementRange | 'custom';

const RANGES: { value: Choice; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'twoWeeks', label: '2 Wks' },
    { value: 'month', label: 'Month' },
    { value: 'threeMonths', label: '3 Mos' },
    { value: 'custom', label: 'Custom' },
];

// "Which one" for a preset, in words; the PDF itself prints the exact dates (the backend owns them)
const WHICH: Record<StatementRange, string[]> = {
    week: ['This week', 'Last week', '2 weeks ago', '3 weeks ago'],
    twoWeeks: ['This week and last', '3–4 weeks ago', '5–6 weeks ago'],
    month: ['This month', 'Last month', '2 months ago', '3 months ago'],
    threeMonths: ['This month and the 2 before', 'The 3 months before that'],
};

/** Matches the backend's limit, so a long range is caught before the request */
const MAX_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A statement of the shifts worked, like a bank's e-statement: a week, two weeks,
 * a month, three months or any dates, for one job or all. Download opens the share
 * sheet with the PDF (every shift with its job, title, times and hours).
 */
export default function StatementScreen() {
    const { colors } = useTheme();
    const jobs = useMyJobs();
    const [range, setRange] = useState<Choice>('month');
    const [offset, setOffset] = useState(0);
    const [jobId, setJobId] = useState<string | null>(null);
    const today = new Date();
    const [from, setFrom] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [to, setTo] = useState(today);
    const [busy, setBusy] = useState(false);

    const days = Math.round((to.getTime() - from.getTime()) / DAY_MS);
    const customError = range !== 'custom' ? null : days < 0 ? 'The last day is before the first.' : days >= MAX_DAYS ? 'A statement covers at most a year.' : null;

    const choose = (next: Choice) => {
        setRange(next);
        setOffset(0);
    };

    const download = async () => {
        const request: StatementRequest = {
            ...(range === 'custom' ? { range, from: toCalendarDateString(from.toISOString()), to: toCalendarDateString(to.toISOString()) } : { range, offset: -offset }),
            ...(jobId && { jobId }),
        };
        setBusy(true);
        try {
            await shareStatement(request);
        } catch (err: any) {
            notify.error('Couldn’t make the statement', { description: err?.message });
        } finally {
            setBusy(false);
        }
    };

    // A grouped card of choices, one ticked
    const choices = <T,>(label: string, options: { value: T; label: string; detail?: string }[], selected: T, onSelect: (value: T) => void) => (
        <>
            <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>{label}</ThemedText>
            <View accessibilityRole="radiogroup" style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xl }}>
                {options.map((option, index) => {
                    const isSelected = option.value === selected;
                    return (
                        <PressableScale
                            key={option.label}
                            onPress={() => onSelect(option.value)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: isSelected }}
                            pressedScale={1}
                            pressedStyle={{ backgroundColor: colors.surfaceLight }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}
                        >
                            <View style={{ flex: 1 }}>
                                <ThemedText weight={isSelected ? 'semibold' : 'normal'} numberOfLines={1}>{option.label}</ThemedText>
                                {option.detail && <ThemedText variant="secondary" size="xs" numberOfLines={1}>{option.detail}</ThemedText>}
                            </View>
                            {isSelected && <Check color={colors.primary} size={20} strokeWidth={2.5} />}
                        </PressableScale>
                    );
                })}
            </View>
        </>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Shift Statement" onCancel={() => router.back()} onSave={download} saveLabel="Download" isSaving={busy} saveDisabled={busy || !!customError} />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="secondary" style={{ marginBottom: spacing.lg, marginLeft: 4 }}>
                    Every shift you worked, with its job, title, times and hours — and pay, if pay estimates are on — as a PDF to keep or send.
                </ThemedText>

                <View style={{ marginBottom: spacing.lg }}>
                    <SegmentedControl options={RANGES} value={range} onChange={choose} size="sm" accessibilityLabel="Period" />
                </View>

                {range === 'custom' ? (
                    <View style={{ marginBottom: spacing.xl }}>
                        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>FIRST DAY</ThemedText>
                        <DateTimeField mode="date" value={from} onChange={setFrom} accessibilityLabel="First day" />
                        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginTop: spacing.md, marginBottom: 8, marginLeft: 4 }}>LAST DAY</ThemedText>
                        <DateTimeField mode="date" value={to} onChange={setTo} accessibilityLabel="Last day" />
                        {customError && <ThemedText color={colors.danger} size="sm" style={{ marginTop: spacing.sm, marginLeft: 4 }}>{customError}</ThemedText>}
                    </View>
                ) : (
                    choices('WHICH', WHICH[range].map((label, index) => ({ value: index, label })), offset, setOffset)
                )}

                {choices<string | null>(
                    'JOBS',
                    [{ value: null, label: 'All jobs' }, ...(jobs.data ?? []).map((job) => ({ value: job.id, label: jobName(job), detail: jobRole(job) ?? undefined }))],
                    jobId,
                    setJobId
                )}
            </ScrollView>
        </View>
    );
}
