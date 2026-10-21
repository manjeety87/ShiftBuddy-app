import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { JobPicker } from '../components/JobPicker';
import { ShiftTimeFields } from '../components/ShiftTimeFields';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { spacing } from '../constants/themes';
import { confirmOverlap, getOverlapConflicts } from '../lib/conflicts';
import { useMyJobs } from '../lib/useMyJobs';
import { fromCalendarDateString } from '../lib/dateUtils';
import { createShift } from '../lib/shifts';
import { defaultShiftTimes, MIN_SHIFT_MINUTES, resolveShiftRange, withDuration, type ShiftTimes } from '../lib/shiftTime';
import { confirmShortShift } from '../lib/shiftDialogs';
import { useDiscardGuard } from '../lib/useDiscardGuard';
import { showAlert } from '../lib/dialog';
import { ThemedInput } from '../components/ui/ThemedInput';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

// What "unchanged" means for the discard prompt: same job, same real start/end, same notes
const shiftFormSnapshot = (jobId: string | null, times: ShiftTimes, notes: string) => {
    const { startAt, endAt } = resolveShiftRange(times);
    return JSON.stringify({ jobId, start: startAt.toISOString(), end: endAt.toISOString(), notes: notes.trim() });
};

export default function CreateShiftScreen() {
    const { data: jobs } = useMyJobs();
    // Opened from a calendar day → start on that day
    const { date } = useLocalSearchParams<{ date?: string }>();

    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [times, setTimes] = useState(() => defaultShiftTimes(date ? fromCalendarDateString(date) : undefined));
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [baseline] = useState(() => shiftFormSnapshot(null, times, ''));
    const { leave } = useDiscardGuard(shiftFormSnapshot(selectedJobId, times, notes), baseline);
    // With exactly one job there's nothing to choose — including the job just added from the picker
    const jobId = selectedJobId ?? (jobs?.length === 1 ? jobs[0].id : null);

    const handleCreate = async () => {
        if (!jobId) {
            showAlert('Missing info', 'Please select a job.');
            return;
        }
        let range = resolveShiftRange(times);
        if (range.durationMinutes === 24 * 60) {
            showAlert('Check the times', 'Start and end are the same time.');
            return;
        }
        if (range.durationMinutes < MIN_SHIFT_MINUTES) {
            const choice = await confirmShortShift(range.durationMinutes);
            if (choice === 'cancel') return;
            if (choice === 'extend') {
                const extended = withDuration(times, MIN_SHIFT_MINUTES);
                setTimes(extended); // the form shows what was actually saved
                range = resolveShiftRange(extended);
            }
        }
        const { startAt, endAt } = range;
        const input = { jobId: jobId, startTime: startAt.toISOString(), endTime: endAt.toISOString(), notes: notes || undefined };

        setIsSubmitting(true);
        try {
            await createShift(input);
            leave();
        } catch (err: any) {
            const conflicts = getOverlapConflicts(err);
            if (!conflicts) {
                showAlert('Could not create shift', err?.response?.data?.message || 'Something went wrong.');
                return;
            }
            if (!(await confirmOverlap(conflicts))) return;
            try {
                await createShift({ ...input, allowOverlap: true });
                leave();
            } catch (retryErr: any) {
                showAlert('Could not create shift', retryErr?.response?.data?.message || 'Something went wrong.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardSafeView>
            <SheetHeader title="New Shift" onCancel={() => router.back()} onSave={handleCreate} saveLabel="Add" isSaving={isSubmitting} />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <JobPicker jobs={jobs} selectedJobId={jobId} onSelect={setSelectedJobId} />

                <ShiftTimeFields value={times} onChange={setTimes} />

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>NOTES</ThemedText>
                <ThemedInput value={notes} onChangeText={setNotes} placeholder="Optional — e.g. closing shift" style={{ marginBottom: 32 }} />

            </ScrollView>
        </KeyboardSafeView>
    );
}