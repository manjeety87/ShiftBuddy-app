import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { AuthDivider, AuthLayout, authErrorCode, authErrorMessage, FormError, type AuthError } from '../../components/AuthLayout';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Button, TextButton } from '../../components/ui/Button';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { ThemedText } from '../../components/ui/ThemedText';
import { spacing } from '../../constants/themes';
import { pendingDeletionOf } from '../../lib/account';
import { useAuth } from '../../lib/auth-context';
import { offerRestore } from '../../lib/restorePrompt';
import { useTheme } from '../../lib/theme-context';

export default function LoginScreen() {
    const { login, restore } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<AuthError | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const passwordRef = useRef<TextInput>(null);

    const canSubmit = email.trim().length > 0 && password.length > 0;

    const handleLogin = async () => {
        if (!canSubmit || isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        const address = email.trim().toLowerCase();
        try {
            await login(address, password);
        } catch (err) {
            const pending = pendingDeletionOf(err);
            const code = authErrorCode(err);
            // Proved it's theirs: bringing it back is their choice, not an error
            if (pending) offerRestore(pending, restore, (message) => setError({ message }));
            // An unknown email's answer is the way to make one; a wrong password's is the way to reset it
            else if (code === 'NO_ACCOUNT') setError({ message: `No account uses ${address}.`, action: { label: 'Create an account', onPress: () => router.push({ pathname: '/(auth)/register', params: { email: address } }) } });
            else if (code === 'WRONG_PASSWORD') setError({ message: 'That password isn’t right.', action: { label: 'Reset it', onPress: () => router.push({ pathname: '/(auth)/forgot-password', params: { email: address } }) } });
            else setError({ message: authErrorMessage(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Typing again means they're fixing it — the old error no longer applies
    const edit = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        if (error) setError(null);
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Log in to see your shifts">
            <ThemedInput
                placeholder="Email"
                value={email}
                onChangeText={edit(setEmail)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                submitBehavior="submit"
                style={{ marginBottom: spacing.sm }}
            />
            <ThemedInput
                ref={passwordRef}
                placeholder="Password"
                value={password}
                onChangeText={edit(setPassword)}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                style={{ marginBottom: spacing.md }}
            />

            <FormError message={error?.message ?? null} action={error?.action} />

            <Button label="Log In" onPress={handleLogin} isLoading={isSubmitting} disabled={!canSubmit} style={{ marginBottom: spacing.lg }} />

            <AuthDivider />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
                <GoogleSignInButton />
                <AppleSignInButton />
            </View>

            <TextButton label="Forgot password?" size="sm" weight="medium" onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <ThemedText variant="secondary">Don’t have an account?</ThemedText>
                <TextButton label="Sign up" color={colors.primary} onPress={() => router.replace('/register')} />
            </View>
        </AuthLayout>
    );
}
