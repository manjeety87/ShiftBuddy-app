import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { AuthLayout, authErrorMessage, FormError, isStrongPassword, PasswordRules } from '../../components/AuthLayout';
import { Button, TextButton } from '../../components/ui/Button';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { spacing } from '../../constants/themes';
import { resetPassword } from '../../lib/auth';
import { notify } from '../../lib/notify';

export default function ResetPasswordScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    const canSubmit = code.trim().length === 6 && isStrongPassword(newPassword) && confirmPassword.length > 0;

    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;
        if (newPassword !== confirmPassword) {
            setError('The two passwords don’t match.');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await resetPassword(email, code.trim(), newPassword);
            notify.success('Password reset', { description: 'Log in with your new password.' });
            router.replace('/(auth)/login');
        } catch (err) {
            setError(authErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const edit = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        if (error) setError(null);
    };

    return (
        <AuthLayout title="Enter code" subtitle={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}>
            <ThemedInput
                placeholder="6-digit code"
                value={code}
                onChangeText={(value) => {
                    edit(setCode)(value);
                    if (value.length === 6) passwordRef.current?.focus(); // full code → straight on
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                style={{ marginBottom: spacing.sm, letterSpacing: 4 }}
            />
            <ThemedInput
                ref={passwordRef}
                placeholder="New password"
                value={newPassword}
                onChangeText={edit(setNewPassword)}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
                style={{ marginBottom: spacing.sm }}
            />
            <PasswordRules password={newPassword} />
            <ThemedInput
                ref={confirmRef}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={edit(setConfirmPassword)}
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={{ marginBottom: spacing.md }}
            />
            <FormError message={error} />
            <Button label="Reset Password" onPress={handleSubmit} isLoading={isSubmitting} disabled={!canSubmit} style={{ marginBottom: spacing.md }} />
            <TextButton label="Didn’t get a code? Go back" size="sm" weight="medium" onPress={() => router.back()} style={{ alignSelf: 'center' }} />
        </AuthLayout>
    );
}
