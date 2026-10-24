import { router, useLocalSearchParams } from 'expo-router';
import { CalendarX, Copy, Navigation, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { JobPicker } from '../../components/JobPicker';
import { ShiftHoursRow } from '../../components/ShiftHoursRow';
import { ShiftTimeFields } from '../../components/ShiftTimeFields';
import { IconActionBar } from '../../components/ui/IconActionBar';
import { ListRow } from '../../components/ui/ListRow';
import { SheetHeader } from '../../components/ui/SheetHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { radius, spacing } from '../../constants/themes';
import { missedTag } from '../../lib/missedShifts';
import { useShiftsChanged } from '../../lib/shiftEvents';
import { useMyJobs } from '../../lib/useMyJobs';
import { getShiftById, updateShift } from '../../lib/shifts';
import { defaultShiftTimes, MIN_SHIFT_MINUTES, resolveShiftRange, toShiftTimes, withDuration, type ShiftTimes } from '../../lib/shiftTime';
import { confirmShortShift } from '../../lib/shiftDialogs';
import { confirmOverlap, getOverlapConflicts } from '../../lib/conflicts';
import { useTheme } from '../../lib/theme-context';
import { useTimesheetChanged } from '../../lib/timesheet';
import { useDiscardGuard } from '../../lib/useDiscardGuard';
import { showAlert } from '../../lib/dialog';
import { deleteShiftsWithUndo } from '../../lib/shiftActions';
import type { Shift } from '../../interfaces/shift.d';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { KeyboardSafeView } from '../../components/ui/KeyboardSafeView';
import { useAuth } from '../../lib/auth-context';
import { featuresOf } from '../../lib/features';

// What "unchanged" means for the discard prompt: same job, same real start/end, same notes
const shiftFormSnapshot = (jobId: string | null, times: ShiftTimes, notes: string) => {
    const { startAt, endAt } = resolveShiftRange(times);
    return JSON.stringify({ jobId, start: startAt.toISOString(), end: endAt.toISOString(), notes: notes.trim() });
};

export default function EditShiftScreen() {
    const { colors } = useTheme();
    const features = featuresOf(useAuth().user);
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: jobs } = useMyJobs();

    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [times, setTimes] = useState(() => defaultShiftTimes());
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [baseline, setBaseline] = useState<string | null>(null); // set once the shift has loaded
    const loadedShift = useRef<Shift | null>(null); // what Undo restores after a delete
    // The saved shift, for the hours row: kept apart from the form so adding hours never resets what's being typed
    const [savedShift, setSavedShift] = useState<Shift | null>(null);
    const [openedAt] = useState(() => Date.now());
    const { leave } = useDiscardGuard(shiftFormSnapshot(selectedJobId, times, notes), baseline);

    useEffect(() => {
        const loadShift = async () => {
            try {
                const shift = await getShiftById(id);
                loadedShift.current = shift;
                setSavedShift(shift);
                const loadedTimes = toShiftTimes(shift.startTime, shift.endTime);
                setSelectedJobId(shift.jobId);
                setTimes(loadedTimes);
                setBaseline(shiftFormSnapshot(shift.jobId, loadedTimes, shift.notes || ''));
                setNotes(shift.notes || '');
            } catch {
                showAlert('Error', 'Could not load this shift.');
                router.back();
            } finally {
                setIsLoading(false);
            }
        };
        loadShift();
    }, [id]);

    // Hours were added, changed or deleted — or the shift marked missed — in the sheet above this one
    const reloadSavedShift = () => {
        getShiftById(id).then(setSavedShift).catch(() => undefined); // the rows keep what they showed; the form is untouched
    };
    useTimesheetChanged(reloadSavedShift);
    useShiftsChanged(reloadSavedShift);

    const handleSave = async () => {
        if (!selectedJobId) { showAlert('Missing info', 'Please select a job.'); return; }
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
        // Notes are always sent on an edit: an emptied field has to clear the saved note
        const input = { jobId: selectedJobId, startTime: startAt.toISOString(), endTime: endAt.toISOString(), notes: notes.trim() };

        setIsSaving(true);
        try {
            await updateShift(id, input);
            leave();
        } catch (err: any) {
            const conflicts = getOverlapConflicts(err);
            if (!conflicts) {
                showAlert('Could not update shift', err?.response?.data?.message || 'Something went wrong.');
                return;
            }
            if (!(await confirmOverlap(conflicts))) return;
            try {
                await updateShift(id, { ...input, allowOverlap: true });
                leave();
            } catch (retryErr: any) {
                showAlert('Could not update shift', retryErr?.response?.data?.message || 'Something went wrong.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // No "are you sure?" — it's deleted at once and the toast offers Undo
    const handleDelete = async () => {
        if (!loadedShift.current) return;
        setIsDeleting(true);
        const wasDeleted = await deleteShiftsWithUndo([loadedShift.current]);
        if (wasDeleted) leave();
        else setIsDeleting(false); // the toast says why; the form stays so nothing is lost
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardSafeView>
            <SheetHeader title="Edit Shift" onCancel={() => router.back()} onSave={handleSave} isSaving={isSaving} saveDisabled={isDeleting} />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <JobPicker jobs={jobs} selectedJobId={selectedJobId} onSelect={setSelectedJobId} />

                <ShiftTimeFields value={times} onChange={setTimes} />

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>NOTES</ThemedText>
                <ThemedInput value={notes} onChangeText={setNotes} placeholder="Optional — e.g. closing shift" style={{ marginBottom: 32 }} />

                {/* Worked and missed can't both be true (the backend refuses it), so a shift with hours offers no "missed" */}
                {savedShift && !savedShift.timeEntries?.length && (
                    <>
                        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>COULDN’T GO?</ThemedText>
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 32 }}>
                            <ListRow
                                icon={CalendarX}
                                label={savedShift.missedReason ? missedTag(savedShift.missedReason) : 'Mark as Missed'}
                                detail={savedShift.missedReason ? savedShift.missedNote ?? 'Not counted toward pay' : 'Sick, called off by your manager…'}
                                onPress={() => router.push(`/missed-shift/${id}`)}
                                isFirst
                            />
                        </View>
                    </>
                )}

                {/* Hours can be added once a shift has begun; ones already clocked (the clock opens 10 minutes early) always show */}
                {savedShift && !savedShift.missedReason && (features.timesheet || !!savedShift.timeEntries?.length) && (Date.parse(savedShift.startTime) <= openedAt || !!savedShift.timeEntries?.length) && (
                    <>
                        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>HOURS WORKED</ThemedText>
                        <View style={{ marginBottom: 32 }}>
                            <ShiftHoursRow shift={savedShift} />
                        </View>
                    </>
                )}

                <IconActionBar
                    actions={[
                        ...(features.leaveBy ? [{ icon: Navigation, label: 'Route', onPress: () => router.push(`/transit/${id}`) }] : []),
                        { icon: Copy, label: 'Copy', onPress: () => router.push(`/copy-shifts?ids=${id}`) },
                        { icon: Trash2, label: 'Delete', onPress: handleDelete, destructive: true, busy: isDeleting, disabled: isSaving },
                    ]}
                />
            </ScrollView>
        </KeyboardSafeView>
    );
}