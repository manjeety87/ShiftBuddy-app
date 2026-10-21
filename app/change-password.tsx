import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ThemedText } from '../components/ui/ThemedText';
import { spacing } from '../constants/themes';
import { changePassword } from '../lib/auth';
import { useAuth } from '../lib/auth-context';
import { clearTokens } from '../lib/storage';
import { SheetHeader } from '../components/ui/SheetHeader';
import { notify } from '../lib/notify';
import { authErrorMessage, FormError, isStrongPassword, PasswordRules } from '../components/AuthLayout';
import { ThemedInput } from '../components/ui/ThemedInput';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

export default function ChangePasswordScreen() {
    const { clearSession } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canSave = currentPassword.length > 0 && isStrongPassword(newPassword) && confirmPassword.length > 0;

    const handleSave = async () => {
        if (newPassword !== confirmPassword) {
            setError('The two new passwords don’t match.');
            return;
        }
        setError(null);
        setIsSaving(true);
        try {
            await changePassword(currentPassword, newPassword);
            // The server signs out every session on a password change — drop ours too,
            // otherwise the app still thinks we're logged in and bounces back from Login.
            await clearTokens();
            notify.success('Password changed', { description: 'Log in again with your new password.' });
            clearSession();
        } catch (err) {
            setError(authErrorMessage(err));
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <KeyboardSafeView>
            <SheetHeader title="Change Password" onCancel={() => router.back()} onSave={handleSave} isSaving={isSaving} saveDisabled={!canSave} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 6, marginLeft: 4 }}>Current password</ThemedText>
                <ThemedInput value={currentPassword} onChangeText={(v) => { setCurrentPassword(v); setError(null); }} secureTextEntry autoComplete="current-password" textContentType="password" autoFocus style={{ marginBottom: spacing.md }} />

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 6, marginLeft: 4 }}>New password</ThemedText>
                <ThemedInput value={newPassword} onChangeText={(v) => { setNewPassword(v); setError(null); }} secureTextEntry autoComplete="new-password" textContentType="newPassword" style={{ marginBottom: spacing.sm }} />
                <PasswordRules password={newPassword} />

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 6, marginLeft: 4 }}>Confirm new password</ThemedText>
                <ThemedInput value={confirmPassword} onChangeText={(v) => { setConfirmPassword(v); setError(null); }} secureTextEntry textContentType="newPassword" style={{ marginBottom: spacing.md }} />

                <FormError message={error} />
                <ThemedText variant="muted" size="xs" style={{ marginLeft: 4, lineHeight: 16 }}>You’ll be signed out everywhere and asked to log in again.</ThemedText>
            </ScrollView>
        </KeyboardSafeView>
    );
}