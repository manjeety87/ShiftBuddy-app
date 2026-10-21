import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { createJobInputFrom, emptyJobForm, isJobFormComplete, JobFormFields, jobFormSnapshot, type JobFormValues } from '../components/JobForm';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';
import { SheetHeader } from '../components/ui/SheetHeader';
import { spacing } from '../constants/themes';
import { createJob } from '../lib/jobs';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';
import { useDiscardGuard } from '../lib/useDiscardGuard';

export default function CreateJobScreen() {
    const { colors } = useTheme();
    const [values, setValues] = useState<JobFormValues>(() => emptyJobForm(colors.jobPalette[0]));
    const [baseline] = useState(() => jobFormSnapshot(values));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { leave } = useDiscardGuard(jobFormSnapshot(values), baseline);

    const handleCreate = async () => {
        setIsSubmitting(true);
        try {
            await createJob(createJobInputFrom(values));
            leave();
        } catch (err: any) {
            notify.error('Couldn’t add the job', { description: err?.response?.data?.details?.[0]?.message || err?.response?.data?.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardSafeView>
            {/* Add stays disabled until the two required fields are filled — no "missing info" dialog needed */}
            <SheetHeader title="New Job" onCancel={() => router.back()} onSave={handleCreate} saveLabel="Add" isSaving={isSubmitting} saveDisabled={!isJobFormComplete(values)} />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <JobFormFields values={values} onChange={setValues} autoFocus />
            </ScrollView>
        </KeyboardSafeView>
    );
}
