import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { authErrorMessage, FormError } from '../components/AuthLayout';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedInput } from '../components/ui/ThemedInput';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { getAccountSummary, requestAccountDeletion } from '../lib/account';
import { useAuth } from '../lib/auth-context';
import { notify } from '../lib/notify';
import { clearTokens } from '../lib/storage';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';

const CONFIRM_WORD = 'DELETE';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' });

/**
 * Deleting the account, said plainly before it happens. It is hidden at once and
 * erased after 30 days; logging in before then offers to restore it. The password
 * (or the word DELETE for a Google/Apple account) is the last step, so it can't
 * happen by a stray tap or from someone else's hands.
 */
export default function DeleteAccountScreen() {
    const { user, clearSession } = useAuth();
    const { colors } = useTheme();
    const [secret, setSecret] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const summary = useFetch(getAccountSummary);
    const usesPassword = !!user?.hasPassword;
    const ready = usesPassword ? secret.length > 0 : secret.trim().toUpperCase() === CONFIRM_WORD;

    const handleDelete = async () => {
        setError(null);
        setIsDeleting(true);
        try {
            const { purgeAt } = await requestAccountDeletion(usesPassword ? { password: secret } : { confirm: CONFIRM_WORD });
            // The server has signed every device out; drop ours too
            await clearTokens();
            notify.success('Your account will be deleted', { description: `On ${longDate(purgeAt)}. Log in before then to restore it.` });
            clearSession();
        } catch (err) {
            setError(authErrorMessage(err, 'Couldn’t delete your account. Please try again.'));
            setIsDeleting(false);
        }
    };

    const steps = [
        { when: 'Right away', text: 'You’re signed out everywhere and your account is hidden. People you share with stop seeing your shifts.' },
        { when: 'For 30 days', text: 'Changed your mind? Log in and choose Restore Account — everything comes back as it was.' },
        { when: 'After that', text: 'Your account, jobs, shifts and hours are erased for good. This can’t be undone.' },
    ];

    return (
        <KeyboardSafeView>
            <SheetHeader title="Delete Account" onCancel={() => router.back()} onSave={handleDelete} saveLabel="Delete" isSaving={isDeleting} saveDisabled={!ready} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <ThemedText variant="secondary" style={{ marginBottom: spacing.md, lineHeight: 20 }}>We’re sorry to see you go. Here’s exactly what happens.</ThemedText>

                {/* The counts are a courtesy: without them the step still works */}
                {summary.data && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                        <ThemedText weight="semibold" size="sm" style={{ marginBottom: 4 }}>Deleted with your account</ThemedText>
                        <ThemedText variant="secondary" size="sm" style={{ lineHeight: 20 }}>
                            {count(summary.data.jobs, 'job', 'jobs')} · {count(summary.data.shifts, 'shift', 'shifts')} · {count(summary.data.timeEntries, 'hours entry', 'hours entries')}
                            {summary.data.shares > 0 ? ` · sharing with ${count(summary.data.shares, 'person', 'people')}` : ''}
                        </ThemedText>
                    </View>
                )}

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg }}>
                    {steps.map((step, index) => (
                        <View key={step.when} style={{ flexDirection: 'row', gap: spacing.sm }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: index === steps.length - 1 ? colors.danger : colors.textMuted }} />
                            <View style={{ flex: 1 }}>
                                <ThemedText weight="semibold" size="sm">{step.when}</ThemedText>
                                <ThemedText variant="secondary" size="sm" style={{ lineHeight: 19 }}>{step.text}</ThemedText>
                            </View>
                        </View>
                    ))}
                </View>

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 6, marginLeft: 4 }}>
                    {usesPassword ? 'Enter your password to confirm' : `Type ${CONFIRM_WORD} to confirm`}
                </ThemedText>
                <ThemedInput
                    value={secret}
                    onChangeText={(value) => {
                        setSecret(value);
                        setError(null);
                    }}
                    secureTextEntry={usesPassword}
                    autoComplete={usesPassword ? 'current-password' : 'off'}
                    textContentType={usesPassword ? 'password' : 'none'}
                    autoCapitalize={usesPassword ? 'none' : 'characters'}
                    autoCorrect={false}
                    style={{ marginBottom: spacing.md }}
                />
                <FormError message={error} />
                <ThemedText variant="muted" size="xs" style={{ marginLeft: 4, lineHeight: 16 }}>
                    Want a copy first? Settings › Your Data › Download. Only need a break? Log out instead — nothing is deleted.
                </ThemedText>
            </ScrollView>
        </KeyboardSafeView>
    );
}
