import { KeyboardAvoidingView, type ViewProps } from 'react-native';
import { useTheme } from '../../lib/theme-context';

/**
 * A screen root that makes room for the keyboard, so a ScrollView inside it can
 * still reach everything (e.g. the Google button under the login form).
 *
 * Needed on Android too: with edge-to-edge (always on since SDK 54) the window no
 * longer shrinks for the keyboard, so `softwareKeyboardLayoutMode: resize` alone
 * leaves the bottom of a form hidden behind it.
 */
export function KeyboardSafeView({ style, children, ...props }: ViewProps) {
    const { colors } = useTheme();
    return (
        <KeyboardAvoidingView behavior="padding" style={[{ flex: 1, backgroundColor: colors.background }, style]} {...props}>
            {children}
        </KeyboardAvoidingView>
    );
}
