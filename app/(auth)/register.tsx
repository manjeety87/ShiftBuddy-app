import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { AuthDivider, AuthLayout, authErrorCode, authErrorMessage, FormError, isStrongPassword, PasswordRules, type AuthError } from '../../components/AuthLayout';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Button, TextButton } from '../../components/ui/Button';
import { ThemedInput } from '../../components/ui/ThemedInput';
import { ThemedText } from '../../components/ui/ThemedText';
import { spacing } from '../../constants/themes';
import { useAuth } from '../../lib/auth-context';

export default function RegisterScreen() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const params = useLocalSearchParams<{ email?: string }>();
    // The email typed at log in comes along ("No account uses … Create an account")
    const [email, setEmail] = useState(params.email ?? '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<AuthError | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    const canSubmit = name.trim().length > 0 && email.trim().length > 0 && isStrongPassword(password) && confirmPassword.length > 0;

    const handleRegister = async () => {
        if (!canSubmit || isSubmitting) return;
        if (password !== confirmPassword) {
            setError({ message: 'The two passwords don’t match.' });
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            await register(name.trim(), email.trim().toLowerCase(), password);
        } catch (err) {
            if (authErrorCode(err) === 'ACCOUNT_PENDING_DELETION') {
                setError({ message: 'This email’s account is set to be deleted — everything is still there.', action: { label: 'Log in to restore it', onPress: () => router.replace('/login') } });
            } else {
                setError({ message: authErrorMessage(err) });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const edit = (setter: (value: string) => void) => (value: string) => {
        setter(value);
        if (error) setError(null);
    };

    return (
        <AuthLayout title="Create account" subtitle="Every shift from every job, in one place">
            <ThemedInput
                placeholder="Full name"
                value={name}
                onChangeText={edit(setName)}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
                style={{ marginBottom: spacing.sm }}
            />
            <ThemedInput
                ref={emailRef}
                placeholder="Email"
                value={email}
                onChangeText={edit(setEmail)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={{ marginBottom: spacing.sm }}
            />
            <ThemedInput
                ref={passwordRef}
                placeholder="Password"
                value={password}
                onChangeText={edit(setPassword)}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
                style={{ marginBottom: spacing.sm }}
            />
            <PasswordRules password={password} />
            <ThemedInput
                ref={confirmRef}
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={edit(setConfirmPassword)}
                secureTextEntry
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleRegister}
                style={{ marginBottom: spacing.md }}
            />

            <FormError message={error?.message ?? null} action={error?.action} />

            <Button label="Create Account" onPress={handleRegister} isLoading={isSubmitting} disabled={!canSubmit} style={{ marginBottom: spacing.lg }} />

            <AuthDivider />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
                <GoogleSignInButton />
                <AppleSignInButton />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <ThemedText variant="secondary">Already have an account?</ThemedText>
                <TextButton label="Log in" onPress={() => router.replace('/login')} />
            </View>
        </AuthLayout>
    );
}
