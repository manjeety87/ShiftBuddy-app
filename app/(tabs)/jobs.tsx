import { router, useFocusEffect } from 'expo-router';
import { Briefcase, CheckSquare, Plus, Trash2, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { JobCard } from '../../components/JobCard';
import { LoadError } from '../../components/ui/LoadError';
import { Screen, useScreenTopInset } from '../../components/ui/Screen';
import { ThemedText } from '../../components/ui/ThemedText';
import { spacing } from '../../constants/themes';
import { deleteJob, getMyJobs, useJobsChanged } from '../../lib/jobs';
import { useTheme } from '../../lib/theme-context';
import { useFetch } from '../../lib/useFetch';
import { showAlert } from '../../lib/dialog';
import { Button, IconButton } from '../../components/ui/Button';

export default function JobsScreen() {
    const { colors } = useTheme();
    const topInset = useScreenTopInset();
    const { data: jobs, isLoading, isRefreshing, error, refetch, refresh } = useFetch(getMyJobs);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
    useJobsChanged(refetch);

    const enterSelectionMode = (jobId: string) => { setSelectionMode(true); setSelectedIds(new Set([jobId])); };
    const toggleSelection = (jobId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(jobId)) next.delete(jobId);
            else next.add(jobId);
            return next;
        });
    };
    const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };
    const selectAll = () => { if (jobs) setSelectedIds(new Set(jobs.map((j) => j.id))); };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        showAlert(
            `Delete ${selectedIds.size} job${selectedIds.size !== 1 ? 's' : ''}?`,
            'Their upcoming shifts are removed too. Shifts you already worked stay in your history. This can’t be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        let successCount = 0;
                        try {
                            for (const id of selectedIds) { await deleteJob(id); successCount++; }
                        } catch {
                            showAlert('Partial delete', `${successCount} job(s) deleted before an error occurred.`);
                        } finally {
                            setIsDeleting(false);
                            exitSelectionMode();
                            refetch();
                        }
                    },
                },
            ]
        );
    };

    return (
        <Screen>
            <View style={{ paddingTop: topInset, paddingHorizontal: spacing.lg, flex: 1 }}>
                {selectionMode ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <IconButton icon={X} accessibilityLabel="Done selecting" onPress={exitSelectionMode} size={40} />
                            <ThemedText weight="semibold">{selectedIds.size} selected</ThemedText>
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <IconButton icon={CheckSquare} accessibilityLabel="Select all" onPress={selectAll} size={40} />
                            {isDeleting ? (
                                <ActivityIndicator color={colors.danger} style={{ width: 40 }} />
                            ) : (
                                <IconButton
                                    icon={Trash2}
                                    accessibilityLabel="Delete selected jobs"
                                    onPress={handleDeleteSelected}
                                    disabled={selectedIds.size === 0}
                                    color={colors.onPrimary}
                                    size={40}
                                    style={{ backgroundColor: colors.danger, opacity: selectedIds.size === 0 ? 0.4 : 1 }}
                                />
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                        <ThemedText size="2xl" weight="bold">Your Jobs</ThemedText>
                        <IconButton
                            icon={Plus}
                            accessibilityLabel="Add a job"
                            onPress={() => router.push('/create-job')}
                            color={colors.onPrimary}
                            size={40}
                            style={{ backgroundColor: colors.primary }}
                        />
                    </View>
                )}

                {isLoading && !jobs ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : error && !jobs ? (
                    <LoadError message={error} onRetry={refresh} pullToRefresh={{ isRefreshing }} />
                ) : jobs && jobs.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 64, gap: spacing.md }}>
                        <Briefcase color={colors.textMuted} size={48} />
                        <View style={{ alignItems: 'center', gap: 4 }}>
                            <ThemedText weight="semibold">No jobs yet</ThemedText>
                            <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center' }}>
                                Add each place you work — your shifts, pay and routes all hang off it.
                            </ThemedText>
                        </View>
                        <Button label="Add Your First Job" icon={Plus} onPress={() => router.push('/create-job')} style={{ alignSelf: 'stretch' }} />
                    </View>
                ) : (
                    <FlatList
                        data={jobs}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <JobCard
                                job={item}
                                selectionMode={selectionMode}
                                selected={selectedIds.has(item.id)}
                                onPress={() => (selectionMode ? toggleSelection(item.id) : router.push(`/edit-job/${item.id}`))}
                                onLongPress={() => { if (!selectionMode) enterSelectionMode(item.id); }}
                            />
                        )}
                        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
                    />
                )}
            </View>
        </Screen>
    );
}