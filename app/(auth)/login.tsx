import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { AuthDivider, AuthLayout, authErrorMessage, FormError } from '../../components/AuthLayout';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Button, TextButton } from '../../components/ui/Button';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { ThemedText } from '../../components/ui/ThemedText';
import { spacing } from '../../constants/themes';
import { pendingDeletionOf } from '../../lib/account';
import { useAuth } from '../../lib/auth-context';
import { showAlert } from '../../lib/dialog';
import { notify } from '../../lib/notify';
import { useTheme } from '../../lib/theme-context';

export default function LoginScreen() {
    const { login, restore } = useAuth();
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const passwordRef = useRef<TextInput>(null);

    const canSubmit = email.trim().length > 0 && password.length > 0;

    const handleLogin = async () => {
        if (!canSubmit || isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await login(email.trim().toLowerCase(), password);
        } catch (err) {
            const pending = pendingDeletionOf(err);
            // Proved it's theirs: bringing it back is their choice, not an error
            if (pending) offerRestore(pending.restoreToken, pending.purgeAt);
            else setError(authErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const offerRestore = (restoreToken: string, purgeAt: string) => {
        const day = new Date(purgeAt).toLocaleDateString(undefined, { dateStyle: 'long' });
        showAlert('Restore your account?', `It’s set to be deleted on ${day}. Restore it and everything comes back — your jobs, shifts and hours, just as you left them.`, [
            { text: 'Not Now', style: 'cancel' },
            {
                text: 'Restore Account',
                onPress: async () => {
                    try {
                        await restore(restoreToken);
                        setPassword('');
                        notify.success('Welcome back! Your account is restored.');
                    } catch (err) {
                        setError(authErrorMessage(err, 'Couldn’t restore your account. Please try again.'));
                    }
                },
            },
        ]);
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

            <FormError message={error} />

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
