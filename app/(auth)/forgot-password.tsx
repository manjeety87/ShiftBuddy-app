import { router } from 'expo-router';
import { useState } from 'react';
import { AuthLayout, authErrorMessage, FormError } from '../../components/AuthLayout';
import { Button, TextButton } from '../../components/ui/Button';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { spacing } from '../../constants/themes';
import { forgotPassword } from '../../lib/auth';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
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
            setError(authErrorMessage(err));
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
            <FormError message={error} />
            <Button label="Send Reset Code" onPress={handleSubmit} isLoading={isSubmitting} disabled={!email.trim()} style={{ marginBottom: spacing.md }} />
            <TextButton label="Back to Log In" size="sm" weight="medium" onPress={() => router.back()} style={{ alignSelf: 'center' }} />
        </AuthLayout>
    );
}
