import { AlertCircle, Check, Circle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { motion } from '../lib/motion';
import { useTheme } from '../lib/theme-context';
import { KeyboardSafeView } from './ui/KeyboardSafeView';
import { TextButton } from './ui/Button';
import { ThemedText } from './ui/ThemedText';

/** The shared frame of the sign-in screens: title, subtitle, then the form, centred and keyboard-safe. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
    return (
        <KeyboardSafeView>
            {/* Scrolling keeps the keyboard open, so Google/Apple stay reachable while typing */}
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl }}
                keyboardShouldPersistTaps="handled"
            >
                <ThemedText size="3xl" weight="bold" style={{ marginBottom: 4 }} accessibilityRole="header">{title}</ThemedText>
                <ThemedText variant="secondary" style={{ marginBottom: spacing.xl, lineHeight: 22 }}>{subtitle}</ThemedText>
                {children}
            </ScrollView>
        </KeyboardSafeView>
    );
}

/**
 * A form's error, shown right where the user is looking (under the fields) instead
 * of in a dialog that interrupts them. Renders nothing when there's no error.
 */
/** An auth error, and the next step it suggests when there is one */
export interface AuthError {
    message: string;
    action?: { label: string; onPress: () => void };
}

/** The machine-readable reason some errors carry (NO_ACCOUNT, WRONG_PASSWORD, …) */
export const authErrorCode = (err: any): string | undefined => err?.response?.data?.details?.code;

export function FormError({ message, action }: { message: string | null; action?: AuthError['action'] }) {
    const { colors } = useTheme();
    if (!message) return null;
    return (
        <Animated.View
            entering={motion.appear}
            accessibilityLiveRegion="polite"
            style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 10, backgroundColor: withAlpha(colors.danger, 0.1), marginBottom: spacing.md }}
        >
            <AlertCircle color={colors.danger} size={16} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
                <ThemedText size="sm" color={colors.danger} style={{ lineHeight: 20 }}>{message}</ThemedText>
                {action && <TextButton label={action.label} size="sm" onPress={action.onPress} style={{ alignSelf: 'flex-start', marginTop: 4 }} />}
            </View>
        </Animated.View>
    );
}

/** "or continue with" between the email form and the Google/Apple buttons */
export function AuthDivider() {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceLight }} />
            <ThemedText variant="muted" size="xs" style={{ marginHorizontal: 12 }}>or continue with</ThemedText>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.surfaceLight }} />
        </View>
    );
}

// Same rules the backend enforces (auth.validation.js), shown while typing instead of after a rejection
const PASSWORD_RULES = [
    { label: '8+ characters', test: (value: string) => value.length >= 8 },
    { label: 'A capital letter', test: (value: string) => /[A-Z]/.test(value) },
    { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
];

export const isStrongPassword = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));

/** Live checklist under a new-password field: each rule turns green as it's met. */
export function PasswordRules({ password }: { password: string }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md, marginLeft: 4 }}>
            {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                    <View key={rule.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {met ? <Check color={colors.success} size={13} strokeWidth={3} /> : <Circle color={colors.textMuted} size={10} />}
                        <ThemedText size="xs" color={met ? colors.success : colors.textMuted}>{rule.label}</ThemedText>
                    </View>
                );
            })}
        </View>
    );
}

/** The server's first validation message, else its message, else a fallback. */
export const authErrorMessage = (err: any, fallback = 'Something went wrong. Please try again.') =>
    err?.response?.data?.details?.[0]?.message || err?.response?.data?.message || fallback;
