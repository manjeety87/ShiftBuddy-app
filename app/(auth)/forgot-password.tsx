import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AuthLayout, authErrorCode, authErrorMessage, FormError, type AuthError } from '../../components/AuthLayout';
import { Button, TextButton } from '../../components/ui/Button';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { spacing } from '../../constants/themes';
import { forgotPassword } from '../../lib/auth';

export default function ForgotPasswordScreen() {
    const params = useLocalSearchParams<{ email?: string }>();
    const [email, setEmail] = useState(params.email ?? '');
    const [error, setError] = useState<AuthError | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim() || isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            await forgotPassword(normalizedEmail);
            router.push({ pathname: '/(auth)/reset-password', params: { email: normalizedEmail } });
        } catch (err) {
            const address = email.trim().toLowerCase();
            if (authErrorCode(err) === 'NO_ACCOUNT') {
                setError({ message: `No account uses ${address}, so there’s no password to reset.`, action: { label: 'Create an account', onPress: () => router.push({ pathname: '/(auth)/register', params: { email: address } }) } });
            } else {
                setError({ message: authErrorMessage(err) });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout title="Forgot password?" subtitle="Enter your email and we’ll send you a code to reset your password.">
            <ThemedInput
                placeholder="Email"
                value={email}
                onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                autoFocus
                style={{ marginBottom: spacing.md }}
            />
            <FormError message={error?.message ?? null} action={error?.action} />
            <Button label="Send Reset Code" onPress={handleSubmit} isLoading={isSubmitting} disabled={!email.trim()} style={{ marginBottom: spacing.md }} />
            <TextButton label="Back to Log In" size="sm" weight="medium" onPress={() => router.back()} style={{ alignSelf: 'center' }} />
        </AuthLayout>
    );
}
