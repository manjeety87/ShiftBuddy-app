import { useRef } from 'react';
import { TextInput, View } from 'react-native';
import { spacing } from '../constants/themes';
import type { CreateJobInput, Job, PayFrequency, UpdateJobInput } from '../interfaces/job.d';
import type { Place } from '../interfaces/user.d';
import { fromCalendarDateString, toCalendarDateString } from '../lib/dateUtils';
import { useTheme } from '../lib/theme-context';
import { DateTimeField } from './DateTimeField';
import { LocationField } from './LocationField';
import { TextButton } from './ui/Button';
import { ColorSwatches } from './ui/ColorSwatches';
import { SegmentedControl } from './ui/SegmentedControl';
import { ThemedInput } from './ui/ThemedInput';
import { ThemedText } from './ui/ThemedText';

// The job form shared by New Job and Edit Job, so both always ask the same
// questions in the same order (workplace first — it's the job's name).

const PAY_FREQUENCY_OPTIONS: { value: PayFrequency; label: string }[] = [
    { value: 'WEEKLY', label: 'Every week' },
    { value: 'BIWEEKLY', label: 'Every 2 weeks' },
];

export interface JobFormValues {
    companyName: string;
    title: string;
    place: Place | null;
    matchKeywords: string;
    hourlyRate: string;
    color: string;
    payFrequency: PayFrequency;
    /** Any one payday ("YYYY-MM-DD"), or null when not set */
    payday: string | null;
}

export const emptyJobForm = (color: string): JobFormValues => ({ companyName: '', title: '', place: null, matchKeywords: '', hourlyRate: '', color, payFrequency: 'BIWEEKLY', payday: null });

export const jobFormFromJob = (job: Job): JobFormValues => ({
    companyName: job.companyName,
    title: job.title,
    // Older jobs may have an address typed in without coordinates — those can't be routed to
    place: job.latitude != null && job.longitude != null ? { address: job.location || 'Pinned location', latitude: job.latitude, longitude: job.longitude } : null,
    matchKeywords: job.matchKeywords || '',
    hourlyRate: job.hourlyRate ? job.hourlyRate.toString() : '',
    color: job.color,
    payFrequency: job.payFrequency ?? 'BIWEEKLY',
    payday: job.payday ?? null,
});

/** What "unchanged" means for the discard prompt */
export const jobFormSnapshot = (values: JobFormValues) =>
    JSON.stringify({ ...values, title: values.title.trim(), companyName: values.companyName.trim() });

export const isJobFormComplete = (values: JobFormValues) => values.companyName.trim().length > 0 && values.title.trim().length > 0;

/** Body for POST /jobs — no place means no location fields at all. */
export const createJobInputFrom = (values: JobFormValues): CreateJobInput => ({
    companyName: values.companyName.trim(),
    title: values.title.trim(),
    location: values.place?.address,
    latitude: values.place?.latitude,
    longitude: values.place?.longitude,
    color: values.color,
    matchKeywords: values.matchKeywords.trim() || undefined,
    hourlyRate: values.hourlyRate ? parseFloat(values.hourlyRate) : undefined,
    payFrequency: values.payFrequency,
    payday: values.payday ?? undefined,
});

/** Body for PATCH /jobs/:id — anything the user emptied (place, keywords, rate) is sent as null so the server clears it. */
export const updateJobInputFrom = (values: JobFormValues): UpdateJobInput => {
    const rate = parseFloat(values.hourlyRate);
    return {
        ...createJobInputFrom(values),
        location: values.place?.address ?? null,
        latitude: values.place?.latitude ?? null,
        longitude: values.place?.longitude ?? null,
        matchKeywords: values.matchKeywords.trim() || null,
        hourlyRate: Number.isFinite(rate) ? rate : null,
        payday: values.payday,
    };
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <View style={{ marginBottom: spacing.md }}>
            <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 6, marginLeft: 4 }}>{label}</ThemedText>
            {children}
            {!!hint && <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginLeft: 4, lineHeight: 16 }}>{hint}</ThemedText>}
        </View>
    );
}

interface JobFormFieldsProps {
    values: JobFormValues;
    onChange: (values: JobFormValues) => void;
    autoFocus?: boolean;
}

export function JobFormFields({ values, onChange, autoFocus }: JobFormFieldsProps) {
    const { colors } = useTheme();
    const roleRef = useRef<TextInput>(null);
    const set = <K extends keyof JobFormValues>(key: K) => (value: JobFormValues[K]) => onChange({ ...values, [key]: value });

    return (
        <>
            <Field label="Workplace">
                <ThemedInput
                    placeholder="e.g. Boathouse"
                    value={values.companyName}
                    onChangeText={set('companyName')}
                    autoFocus={autoFocus}
                    autoCapitalize="words"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => roleRef.current?.focus()}
                />
            </Field>
            <Field label="Your role">
                <ThemedInput ref={roleRef} placeholder="e.g. Retail Sales Supervisor" value={values.title} onChangeText={set('title')} autoCapitalize="words" returnKeyType="done" />
            </Field>
            <Field label="Location" hint="Needed for leave-by times and travel warnings.">
                <LocationField value={values.place} onChange={set('place')} pickerTitle="Where is this job?" />
            </Field>
            <Field label="Hourly rate (optional)" hint="Used for estimated pay.">
                <ThemedInput placeholder="e.g. 17.50" value={values.hourlyRate} onChangeText={set('hourlyRate')} keyboardType="decimal-pad" />
            </Field>
            <Field label="How often you’re paid">
                <SegmentedControl options={PAY_FREQUENCY_OPTIONS} value={values.payFrequency} onChange={set('payFrequency')} accessibilityLabel="How often you’re paid" />
            </Field>
            <Field label="A payday (optional)" hint="Pick any day you were, or will be, paid. Your timesheet then follows your pay periods: the full weeks before each payday week.">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {values.payday ? (
                        <>
                            <DateTimeField mode="date" value={fromCalendarDateString(values.payday)} onChange={(date) => set('payday')(toCalendarDateString(date.toISOString()))} accessibilityLabel="A payday" />
                            <TextButton label="Clear" size="sm" color={colors.textSecondary} onPress={() => set('payday')(null)} />
                        </>
                    ) : (
                        <TextButton label="Set a payday" onPress={() => set('payday')(toCalendarDateString(new Date().toISOString()))} />
                    )}
                </View>
            </Field>
            <Field label="Match keywords (optional)" hint="Words that mark this job on a scanned schedule, separated by commas.">
                <ThemedInput placeholder="e.g. Key Holder, BHR, 070" value={values.matchKeywords} onChangeText={set('matchKeywords')} autoCapitalize="none" />
            </Field>
            <Field label="Colour">
                <ColorSwatches colors={colors.jobPalette} selected={values.color} onSelect={set('color')} label="Job colour" />
            </Field>
        </>
    );
}
