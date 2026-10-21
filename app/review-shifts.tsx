import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Briefcase, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/ui/PressableScale';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { ExtractedShift } from '../interfaces/shift.d';
import { formatDate, formatTime } from '../lib/dateUtils';
import { useMyJobs } from '../lib/useMyJobs';
import { createShiftsBulk } from '../lib/shifts';
import { readableTextOn, withAlpha } from '../lib/color';
import { useTheme } from '../lib/theme-context';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { notify } from '../lib/notify';
import { jobName } from '../lib/jobLabels';
import { Button } from '../components/ui/Button';

interface ReviewItem extends ExtractedShift {
    selected: boolean;
    jobId: string | null;
}

export default function ReviewShiftsScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { shifts: shiftsParam } = useLocalSearchParams<{ shifts: string }>();
    const extractedShifts: ExtractedShift[] = JSON.parse(shiftsParam);

    const { data: jobs } = useMyJobs();
    const hasNoJobs = jobs?.length === 0;
    // With exactly one job every shift belongs to it — including a job added from this screen
    const onlyJobId = jobs?.length === 1 ? jobs[0].id : null;
    const jobIdOf = (item: ReviewItem) => item.jobId ?? onlyJobId;

    const [items, setItems] = useState<ReviewItem[]>(
        extractedShifts.map((shift) => ({ ...shift, selected: true, jobId: shift.suggestedJobId ?? null }))
    );
    const [isSaving, setIsSaving] = useState(false);
    const selectedCount = items.filter((item) => item.selected).length;

    const toggleSelected = (index: number) => {
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
    };

    const assignJob = (index: number, jobId: string) => {
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, jobId } : item)));
    };

    // "+ New Job" on a card: the job created next goes on that card's shift
    const knownJobIds = useRef<Set<string> | null>(null);
    const newJobForIndex = useRef<number | null>(null);
    useEffect(() => {
        if (!jobs) return;
        const known = knownJobIds.current;
        knownJobIds.current = new Set(jobs.map((job) => job.id));
        const target = newJobForIndex.current;
        const added = known && target !== null ? jobs.find((job) => !known.has(job.id)) : undefined;
        if (!added) return;
        newJobForIndex.current = null;
        setItems((prev) => prev.map((item, i) => (i === target ? { ...item, jobId: added.id } : item)));
    }, [jobs]);

    const openCreateJob = () => router.push('/create-job');

    const openCreateJobFor = (index: number) => {
        // Pin the "only job" default first — once a second job exists it would no longer apply
        setItems((prev) => prev.map((item) => (item.jobId ? item : { ...item, jobId: onlyJobId })));
        newJobForIndex.current = index;
        openCreateJob();
    };

    const handleSaveAll = async () => {
        const toSave = items.filter((item) => item.selected);
        if (toSave.length === 0) { showAlert('Nothing selected', 'Please select at least one shift to save.'); return; }
        if (hasNoJobs) { showAlert('Add a job first', 'Every shift belongs to a job. Add the place you work, then save these shifts.', [{ text: 'Not Now', style: 'cancel' }, { text: 'Add Job', onPress: openCreateJob }]); return; }
        const missingJob = toSave.find((item) => !jobIdOf(item));
        if (missingJob) { showAlert('Missing job', 'Please select a job for every selected shift.'); return; }

        setIsSaving(true);
        try {
            // Overlapping shifts are skipped server-side — almost always the same schedule scanned twice.
            const { created, skipped } = await createShiftsBulk(
                toSave.map((item) => ({ jobId: jobIdOf(item)!, startTime: item.startTime, endTime: item.endTime, notes: item.notes }))
            );
            const added = `${created.length} shift${created.length !== 1 ? 's' : ''} added.`;
            const skippedNote = skipped.length > 0
                ? `\n${skipped.length} skipped because ${skipped.length === 1 ? 'it overlaps a shift' : 'they overlap shifts'} you already have.`
                : '';
            if (created.length > 0) notify.success(added.replace(/\.$/, ''), { description: skippedNote.trim() || undefined });
            else notify.info('Nothing added', { description: skippedNote.trim() || undefined });
            router.dismissAll();
            router.replace('/(tabs)/shifts');
        } catch (err: any) {
            showAlert('Could not save shifts', err?.response?.data?.message || 'Nothing was saved. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Review Shifts" onCancel={() => router.back()} />
            <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
                <ThemedText variant="muted" size="sm" style={{ marginBottom: spacing.lg }}>
                    Found {items.length} shift{items.length !== 1 ? 's' : ''}
                    {hasNoJobs ? '' : onlyJobId ? ` for ${jobName(jobs![0])}` : ' — select a job for each before saving'}
                </ThemedText>

                {hasNoJobs && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.12) }}>
                                <Briefcase color={colors.primary} size={18} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText weight="semibold">Add a job to save these</ThemedText>
                                <ThemedText variant="secondary" size="sm">Every shift belongs to a job. Add where you work — your scanned shifts stay right here.</ThemedText>
                            </View>
                        </View>
                        <PressableScale
                            onPress={openCreateJob}
                            accessibilityRole="button"
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: radius.md, backgroundColor: withAlpha(colors.primary, 0.12) }}
                        >
                            <Plus color={colors.primary} size={16} />
                            <ThemedText color={colors.primary} weight="semibold" size="sm">Add Job</ThemedText>
                        </PressableScale>
                    </View>
                )}

                <FlatList
                    data={items}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    renderItem={({ item, index }) => (
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <ThemedText weight="semibold">{formatDate(item.startTime)}</ThemedText>
                                <Switch value={item.selected} onValueChange={() => toggleSelected(index)} trackColor={{ true: colors.primary }} />
                            </View>

                            <ThemedText variant="secondary" size="sm" style={{ marginBottom: 8 }}>
                                {formatTime(item.startTime)} – {formatTime(item.endTime)}
                            </ThemedText>

                            {item.needsReview && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '26', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, marginBottom: 12 }}>
                                    <AlertTriangle color={colors.warning} size={14} />
                                    <ThemedText color={colors.warning} size="xs" style={{ marginLeft: 8 }}>Please double-check this time</ThemedText>
                                </View>
                            )}

                            {item.selected && !!jobs?.length && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                    {jobs.map((job) => {
                                        const isChosen = jobIdOf(item) === job.id;
                                        return (
                                            <PressableScale
                                                key={job.id}
                                                onPress={() => assignJob(index, job.id)}
                                                accessibilityRole="radio"
                                                accessibilityState={{ checked: isChosen }}
                                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: isChosen ? job.color : colors.surfaceLight }}
                                            >
                                                <ThemedText color={isChosen ? readableTextOn(job.color) : colors.textPrimary} size="xs">{jobName(job)}</ThemedText>
                                            </PressableScale>
                                        );
                                    })}
                                    <PressableScale
                                        onPress={() => openCreateJobFor(index)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Add a new job for this shift"
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary }}
                                    >
                                        <Plus color={colors.primary} size={12} strokeWidth={2.5} />
                                        <ThemedText color={colors.primary} size="xs" weight="medium">New Job</ThemedText>
                                    </PressableScale>
                                </View>
                            )}
                        </View>
                    )}
                />

                {/* Still tappable without jobs — it explains what's missing instead of doing nothing */}
                <Button
                    label={`Save ${selectedCount} Shift${selectedCount !== 1 ? 's' : ''}`}
                    onPress={handleSaveAll}
                    isLoading={isSaving}
                    style={{ opacity: hasNoJobs || selectedCount === 0 ? 0.5 : 1, marginTop: spacing.md, marginBottom: insets.bottom + 8 }}
                />
            </View>
        </View>
    );
}