import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Clock9, Timer, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { DateTimeField } from '../../components/DateTimeField';
import { JobPicker } from '../../components/JobPicker';
import { ShiftTimeFields } from '../../components/ShiftTimeFields';
import { TextButton } from '../../components/ui/Button';
import { IconActionBar } from '../../components/ui/IconActionBar';
import { KeyboardSafeView } from '../../components/ui/KeyboardSafeView';
import { PressableScale } from '../../components/ui/PressableScale';
import { SheetHeader } from '../../components/ui/SheetHeader';
import { ThemedText } from '../../components/ui/ThemedText';
import { radius, spacing } from '../../constants/themes';
import { showAlert } from '../../lib/dialog';
import { jobName } from '../../lib/jobLabels';
import { notify } from '../../lib/notify';
import { getShiftById } from '../../lib/shifts';
import { defaultShiftTimes, formatDuration, resolveShiftRange, toShiftTimes, type ShiftTimes } from '../../lib/shiftTime';
import { useTheme } from '../../lib/theme-context';
import { BREAK_CHOICES, createTimeEntry, deleteTimeEntry, getTimeEntry, updateTimeEntry, type TimeEntry } from '../../lib/timesheet';
import { useDiscardGuard } from '../../lib/useDiscardGuard';
import { useMyJobs } from '../../lib/useMyJobs';
import { useNow } from '../../lib/useNow';
import { withAlpha } from '../../lib/color';

const NEW_ENTRY = 'new';
// The same rule the backend applies at clock-out; shown as the starting choice until the user picks a break
const usualBreak = (durationMinutes: number) => (durationMinutes > 5 * 60 ? 30 : 0);

/** A new entry starts as the most recent 9–5 that has already finished (hours can't be added for the future). */
const startingTimes = () => {
    const day = new Date();
    if (day.getHours() < 17) day.setDate(day.getDate() - 1);
    return defaultShiftTimes(day);
};

const snapshot = (jobId: string | null, times: ShiftTimes, breakMinutes: number) => {
    const { startAt, endAt } = resolveShiftRange(times);
    return JSON.stringify({ jobId, start: startAt.toISOString(), end: endAt.toISOString(), breakMinutes });
};

/**
 * One timesheet entry: `/edit-time-entry/<id>` fixes what the clock recorded (forgot
 * to clock out, the shift ran long, a different break); `/edit-time-entry/new?jobId=`
 * adds hours by hand (forgot to clock in, a shift that wasn't on the schedule).
 */
export default function EditTimeEntryScreen() {
    const { colors } = useTheme();
    const { id, jobId: jobIdParam, shiftId } = useLocalSearchParams<{ id: string; jobId?: string; shiftId?: string }>();
    const isNew = id === NEW_ENTRY;
    const { data: jobs } = useMyJobs();

    const [entry, setEntry] = useState<TimeEntry | null>(null);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(jobIdParam ?? null);
    const [times, setTimes] = useState<ShiftTimes | null>(() => (isNew ? startingTimes() : null));
    // null = not chosen yet: follow the usual break for the entry's length
    const [chosenBreak, setChosenBreak] = useState<number | null>(null);
    const [baseline, setBaseline] = useState<string | null>(() => (isNew && times ? snapshot(jobIdParam ?? null, times, usualBreak(resolveShiftRange(times).durationMinutes)) : null));
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    // Still on the clock: only the clock-in time is edited, until they say they've finished
    const [finishing, setFinishing] = useState(false);
    const now = useNow();

    // With one job there's nothing to choose
    const jobId = isNew ? selectedJobId ?? (jobs?.length === 1 ? jobs[0].id : null) : entry?.jobId ?? null;
    const range = times ? resolveShiftRange(times) : null;
    const breakMinutes = chosenBreak ?? (range ? usualBreak(range.durationMinutes) : 0);
    const { leave } = useDiscardGuard(times ? snapshot(isNew ? selectedJobId : jobId, times, breakMinutes) : '', baseline);

    // Hours for a scheduled shift start as that shift's own job and times — usually only the end needs changing
    const [shiftJobName, setShiftJobName] = useState<string | null>(null);
    useEffect(() => {
        if (!isNew || !shiftId) return;
        getShiftById(shiftId)
            .then((shift) => {
                const shiftTimes = toShiftTimes(shift.startTime, shift.endTime);
                setSelectedJobId(shift.jobId);
                setShiftJobName(jobName(shift.job));
                setTimes(shiftTimes);
                setBaseline(snapshot(shift.jobId, shiftTimes, usualBreak(resolveShiftRange(shiftTimes).durationMinutes)));
            })
            .catch(() => {
                notify.error('Couldn’t open this shift');
                router.back();
            });
    }, [isNew, shiftId]);

    useEffect(() => {
        if (isNew) return;
        getTimeEntry(id)
            .then((loaded) => {
                // Still on the clock: the form starts with "until now", and saving clocks out at the chosen time
                const loadedTimes = toShiftTimes(loaded.clockIn, loaded.clockOut ?? new Date().toISOString());
                setEntry(loaded);
                setTimes(loadedTimes);
                setChosenBreak(loaded.breakMinutes);
                setBaseline(snapshot(loaded.jobId, loadedTimes, loaded.breakMinutes));
            })
            .catch(() => {
                notify.error('Couldn’t open this entry');
                router.back();
            });
    }, [id, isNew]);

    if (!times || !range || (!isNew && !entry)) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const paidMinutes = Math.max(0, range.durationMinutes - breakMinutes);
    const isRunning = !isNew && !entry!.clockOut && !finishing;
    const runningMinutes = Math.max(0, Math.round((now - range.startAt.getTime()) / 60000));

    // "I've finished": the end starts at now, so the length is right from the first look
    const finish = () => {
        setTimes({ ...times, end: new Date() });
        setFinishing(true);
    };

    const handleSaveClockIn = async () => {
        if (range.startAt.getTime() > Date.now()) {
            showAlert('That’s later than now', 'Clock-in can’t be in the future.');
            return;
        }
        setIsSaving(true);
        try {
            await updateTimeEntry(id, { clockIn: range.startAt.toISOString() });
            notify.success('Clock-in time updated', { description: 'You’re still on the clock.' });
            leave();
        } catch (err: any) {
            showAlert('Couldn’t save', err?.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!jobId) {
            showAlert('Which job?', 'Choose the job these hours were for.');
            return;
        }
        const body = { clockIn: range.startAt.toISOString(), clockOut: range.endAt.toISOString(), breakMinutes };
        setIsSaving(true);
        try {
            if (isNew) await createTimeEntry(shiftId ? { shiftId, ...body } : { jobId, ...body });
            else await updateTimeEntry(id, body);
            leave();
        } catch (err: any) {
            showAlert(isNew ? 'Couldn’t add these hours' : 'Couldn’t save', err?.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        showAlert('Delete this entry?', 'These hours come off your timesheet. Your scheduled shift stays.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    setIsDeleting(true);
                    try {
                        await deleteTimeEntry(id);
                        notify.success('Entry deleted');
                        leave();
                    } catch (err: any) {
                        notify.error('Couldn’t delete the entry', { description: err?.response?.data?.message });
                        setIsDeleting(false);
                    }
                },
            },
        ]);
    };

    return (
        <KeyboardSafeView>
            <SheetHeader
                title={isNew ? shiftJobName ?? 'Add Hours' : jobName(entry!.job)}
                onCancel={() => router.back()}
                onSave={isRunning ? handleSaveClockIn : handleSave}
                saveLabel={isNew ? 'Add' : !isRunning && !entry!.clockOut ? 'Clock Out' : undefined}
                isSaving={isSaving}
                saveDisabled={isDeleting}
            />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                {isNew && shiftId ? (
                    <ThemedText variant="secondary" size="sm" style={{ marginBottom: spacing.md }}>
                        These start as your scheduled times. Change them to what you actually worked.
                    </ThemedText>
                ) : isNew ? (
                    <JobPicker jobs={jobs} selectedJobId={jobId} onSelect={setSelectedJobId} />
                ) : !entry!.clockOut && finishing ? (
                    <View style={{ marginBottom: spacing.md }}>
                        <ThemedText variant="secondary" size="sm">Set when you finished — saving clocks you out at that time.</ThemedText>
                        <TextButton label="Keep me clocked in" size="sm" weight="medium" onPress={() => setFinishing(false)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    </View>
                ) : null}

                {isRunning ? (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: withAlpha(colors.primary, 0.12), marginBottom: spacing.lg }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                            <ThemedText weight="semibold" style={{ flex: 1 }}>
                                On the clock <ThemedText variant="secondary" weight="normal">· {formatDuration(runningMinutes)} so far</ThemedText>
                            </ThemedText>
                            <Timer color={colors.primary} size={18} />
                        </View>

                        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>CLOCKED IN</ThemedText>
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10 }}>
                                <CalendarDays color={colors.textSecondary} size={18} />
                                <ThemedText style={{ flex: 1 }}>Date</ThemedText>
                                <DateTimeField mode="date" value={times.date} onChange={(date) => setTimes({ ...times, date })} accessibilityLabel="Date" />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.surfaceLight }}>
                                <Clock9 color={colors.textSecondary} size={18} />
                                <ThemedText style={{ flex: 1 }}>Clocked in at</ThemedText>
                                <DateTimeField mode="time" value={times.start} onChange={(start) => setTimes({ ...times, start })} accessibilityLabel="Clocked in at" minuteInterval={1} />
                            </View>
                        </View>
                        <ThemedText variant="muted" size="xs" style={{ marginTop: 8, marginLeft: 4, marginBottom: spacing.lg }}>
                            Clocked in late, or forgot to? Fix the time — you stay on the clock.
                        </ThemedText>

                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <View style={{ flex: 1 }}>
                                <ThemedText weight="medium">Clock-out</ThemedText>
                                <ThemedText variant="secondary" size="xs">Set when you clock out. Your unpaid break is added then.</ThemedText>
                            </View>
                            <TextButton label="I’ve Finished" size="sm" weight="semibold" onPress={finish} />
                        </View>
                    </>
                ) : (
                    <>
                        <ShiftTimeFields value={times} onChange={setTimes} />

                        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>UNPAID BREAK</ThemedText>
                        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
                            {BREAK_CHOICES.map((minutes) => {
                                const isOn = breakMinutes === minutes;
                                return (
                                    <PressableScale
                                        key={minutes}
                                        onPress={() => setChosenBreak(minutes)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: isOn }}
                                        style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: isOn ? colors.primary : colors.surface }}
                                    >
                                        <ThemedText size="sm" weight="medium" color={isOn ? colors.onPrimary : colors.textPrimary}>{minutes === 0 ? 'None' : `${minutes} min`}</ThemedText>
                                    </PressableScale>
                                );
                            })}
                        </View>

                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl, flexDirection: 'row', alignItems: 'center' }}>
                            <ThemedText variant="secondary" style={{ flex: 1 }}>Paid time</ThemedText>
                            <ThemedText size="lg" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(paidMinutes)}</ThemedText>
                        </View>
                    </>
                )}

                {!isNew && <IconActionBar actions={[{ icon: Trash2, label: 'Delete entry', onPress: handleDelete, destructive: true, busy: isDeleting, disabled: isSaving }]} />}
            </ScrollView>
        </KeyboardSafeView>
    );
}
