import { router } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { sendVerificationCode, verifyEmail } from '../lib/auth';
import { useAuth } from '../lib/auth-context';
import { withAlpha } from '../lib/color';
import { useTheme } from '../lib/theme-context';
import { notify } from '../lib/notify';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

/** Enter the 6-digit code we emailed. Submits on its own once all six digits are in. */
export default function VerifyEmailScreen() {
    const { colors } = useTheme();
    const { user, refreshUser } = useAuth();
    const inputRef = useRef<TextInput>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const submit = async (value: string) => {
        setIsVerifying(true);
        setError(null);
        try {
            refreshUser(await verifyEmail(value));
            notify.success('Email verified');
            router.back();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Couldn’t verify right now. Please try again.');
            setCode('');
            inputRef.current?.focus();
        } finally {
            setIsVerifying(false);
        }
    };

    const handleChange = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
        setCode(digits);
        setError(null);
        if (digits.length === CODE_LENGTH) submit(digits);
    };

    const handleResend = async () => {
        setCooldown(RESEND_COOLDOWN_S);
        setError(null);
        try {
            await sendVerificationCode();
        } catch (err: any) {
            setCooldown(0);
            setError(err?.response?.data?.message || 'Couldn’t send a new code. Please try again.');
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Verify email" onCancel={() => router.back()} />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
                <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.12), marginTop: spacing.md }}>
                    <MailCheck color={colors.primary} size={30} />
                </View>
                <ThemedText size="xl" weight="bold" style={{ marginTop: spacing.md }}>Check your email</ThemedText>
                <ThemedText variant="secondary" style={{ textAlign: 'center', marginTop: 6, lineHeight: 22 }}>
                    We sent a 6-digit code to{'\n'}
                    <ThemedText weight="semibold">{user?.email}</ThemedText>
                </ThemedText>

                {/* One real input, drawn as six boxes */}
                <PressableScale onPress={() => inputRef.current?.focus()} pressedScale={1} accessibilityLabel="Verification code" style={{ flexDirection: 'row', gap: 8, marginTop: spacing.xl }}>
                    {Array.from({ length: CODE_LENGTH }, (_, i) => {
                        const isCurrent = i === code.length;
                        return (
                            <View
                                key={i}
                                style={{
                                    width: 46, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: colors.surface, borderWidth: 1.5,
                                    borderColor: error ? colors.danger : isCurrent ? colors.primary : colors.surfaceLight,
                                }}
                            >
                                <ThemedText size="2xl" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{code[i] ?? ''}</ThemedText>
                            </View>
                        );
                    })}
                </PressableScale>
                <TextInput
                    ref={inputRef}
                    value={code}
                    onChangeText={handleChange}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    autoFocus
                    editable={!isVerifying}
                    style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
                />

                <View style={{ minHeight: 44, justifyContent: 'center', marginTop: spacing.md }}>
                    {isVerifying ? (
                        <ActivityIndicator color={colors.primary} />
                    ) : error ? (
                        <ThemedText size="sm" color={colors.danger} style={{ textAlign: 'center' }}>{error}</ThemedText>
                    ) : null}
                </View>

                <PressableScale onPress={handleResend} disabled={cooldown > 0} pressedScale={1} pressedStyle={{ opacity: 0.6 }} hitSlop={8} style={{ padding: spacing.sm }}>
                    <ThemedText size="sm" weight="semibold" color={cooldown > 0 ? colors.textMuted : colors.primary}>
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </ThemedText>
                </PressableScale>
                <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                    Can’t find it? Check your spam folder. Codes expire after 10 minutes.
                </ThemedText>
            </ScrollView>
        </View>
    );
}
