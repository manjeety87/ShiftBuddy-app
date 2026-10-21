import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, ChevronDown, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import type { Job } from '../interfaces/job.d';
import { withAlpha } from '../lib/color';
import { jobName, jobRole } from '../lib/jobLabels';
import { useTheme } from '../lib/theme-context';
import { BottomSheet } from './ui/BottomSheet';
import { TextButton } from './ui/Button';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

interface JobPickerProps {
    jobs: Job[] | null;
    selectedJobId: string | null;
    onSelect: (jobId: string) => void;
}

/**
 * The job a shift belongs to, as a select: one row shows the chosen job; tapping
 * it opens a sheet with every job (and "New Job"). Stays one row tall however
 * many jobs there are, so the times below don't get pushed off screen.
 */
export function JobPicker({ jobs, selectedJobId, onSelect }: JobPickerProps) {
    const { colors } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const selected = jobs?.find((job) => job.id === selectedJobId) ?? null;

    // A job created from "New Job" in the sheet is picked as soon as it appears
    const knownIds = useRef<Set<string> | null>(null);
    const isAddingJob = useRef(false);
    useEffect(() => {
        if (!jobs) return;
        const known = knownIds.current;
        knownIds.current = new Set(jobs.map((job) => job.id));
        if (!known || !isAddingJob.current) return;
        const added = jobs.find((job) => !known.has(job.id));
        if (added) {
            isAddingJob.current = false;
            onSelect(added.id);
        }
    }, [jobs, onSelect]);

    const choose = (jobId: string) => {
        if (Platform.OS === 'ios') Haptics.selectionAsync();
        onSelect(jobId);
        setIsOpen(false);
    };

    const addJob = () => {
        isAddingJob.current = true;
        setIsOpen(false);
        router.push('/create-job');
    };

    const field = () => {
        if (jobs === null) return <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />;
        if (jobs.length === 0) {
            return (
                <PressableScale onPress={addJob} accessibilityRole="button" pressedScale={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                    <Plus color={colors.primary} size={18} />
                    <ThemedText color={colors.primary} weight="medium">Add your first job</ThemedText>
                </PressableScale>
            );
        }
        return (
            <PressableScale
                onPress={() => setIsOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={selected ? `Job: ${jobName(selected)}` : 'Choose a job'}
                accessibilityHint="Opens the list of your jobs"
                pressedScale={0.98}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 56 }}
            >
                {selected ? (
                    <>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selected.color }} />
                        <View style={{ flex: 1 }}>
                            <ThemedText weight="semibold" numberOfLines={1}>{jobName(selected)}</ThemedText>
                            {!!jobRole(selected) && <ThemedText variant="secondary" size="xs" numberOfLines={1}>{jobRole(selected)}</ThemedText>}
                        </View>
                    </>
                ) : (
                    <ThemedText variant="muted" style={{ flex: 1 }}>Choose a job</ThemedText>
                )}
                <ChevronDown color={colors.textMuted} size={18} />
            </PressableScale>
        );
    };

    return (
        <View style={{ marginBottom: spacing.lg }}>
            <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>JOB</ThemedText>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>{field()}</View>

            <BottomSheet
                visible={isOpen}
                onClose={() => setIsOpen(false)}
                header={
                    <>
                        <ThemedText weight="semibold">Choose a job</ThemedText>
                        <TextButton label="New Job" icon={Plus} size="sm" onPress={addJob} />
                    </>
                }
            >
                <ScrollView accessibilityRole="radiogroup" contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                    {jobs?.map((job) => {
                        const isSelected = job.id === selectedJobId;
                        return (
                            <PressableScale
                                key={job.id}
                                onPress={() => choose(job.id)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: isSelected }}
                                accessibilityLabel={jobRole(job) ? `${jobName(job)}, ${jobRole(job)}` : jobName(job)}
                                pressedScale={1}
                                pressedStyle={{ backgroundColor: colors.surfaceLight }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.md, backgroundColor: isSelected ? withAlpha(job.color, 0.12) : 'transparent' }}
                            >
                                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: job.color }} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText weight={isSelected ? 'semibold' : 'normal'} numberOfLines={1}>{jobName(job)}</ThemedText>
                                    {!!jobRole(job) && <ThemedText variant="secondary" size="xs" numberOfLines={1}>{jobRole(job)}</ThemedText>}
                                </View>
                                {isSelected && <Check color={job.color} size={20} strokeWidth={2.5} />}
                            </PressableScale>
                        );
                    })}
                </ScrollView>
            </BottomSheet>
        </View>
    );
}
