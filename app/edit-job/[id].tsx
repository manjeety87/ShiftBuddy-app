import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { isJobFormComplete, JobFormFields, jobFormFromJob, jobFormSnapshot, updateJobInputFrom, type JobFormValues } from '../../components/JobForm';
import { IconActionBar } from '../../components/ui/IconActionBar';
import { SheetHeader } from '../../components/ui/SheetHeader';
import { spacing } from '../../constants/themes';
import { showAlert } from '../../lib/dialog';
import { deleteJob, getJobById, updateJob } from '../../lib/jobs';
import { notify } from '../../lib/notify';
import { useTheme } from '../../lib/theme-context';
import { useDiscardGuard } from '../../lib/useDiscardGuard';
import { KeyboardSafeView } from '../../components/ui/KeyboardSafeView';

export default function EditJobScreen() {
    const { colors } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [values, setValues] = useState<JobFormValues | null>(null);
    const [baseline, setBaseline] = useState<string | null>(null); // set once the job has loaded
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { leave } = useDiscardGuard(values ? jobFormSnapshot(values) : '', baseline);

    useEffect(() => {
        getJobById(id)
            .then((job) => {
                const loaded = jobFormFromJob(job);
                setValues(loaded);
                setBaseline(jobFormSnapshot(loaded));
            })
            .catch(() => {
                notify.error('Couldn’t open this job');
                router.back();
            });
    }, [id]);

    const handleSave = async () => {
        if (!values) return;
        setIsSaving(true);
        try {
            await updateJob(id, updateJobInputFrom(values));
            leave();
        } catch (err: any) {
            notify.error('Couldn’t save the job', { description: err?.response?.data?.details?.[0]?.message || err?.response?.data?.message });
        } finally {
            setIsSaving(false);
        }
    };

    // A decision with consequences, so it's a question (jobs have no Undo)
    const handleDelete = () => {
        showAlert('Delete this job?', 'It disappears from your job list and its upcoming shifts are removed. Shifts you already worked there stay in your history.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    setIsDeleting(true);
                    try {
                        await deleteJob(id);
                        notify.success('Job deleted');
                        leave();
                    } catch (err: any) {
                        notify.error('Couldn’t delete the job', { description: err?.response?.data?.message });
                        setIsDeleting(false);
                    }
                },
            },
        ]);
    };

    if (!values) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardSafeView>
            <SheetHeader title="Edit Job" onCancel={() => router.back()} onSave={handleSave} isSaving={isSaving} saveDisabled={isDeleting || !isJobFormComplete(values)} />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <JobFormFields values={values} onChange={setValues} />
                <View style={{ marginTop: spacing.lg }}>
                    <IconActionBar actions={[{ icon: Trash2, label: 'Delete job', onPress: handleDelete, destructive: true, busy: isDeleting, disabled: isSaving }]} />
                </View>
            </ScrollView>
        </KeyboardSafeView>
    );
}
