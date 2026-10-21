import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

export function Screen({ style, children, ...props }: ViewProps) {
    const { colors } = useTheme();
    return (
        <View style={[{ flex: 1, backgroundColor: colors.background }, style]} {...props}>
            {children}
        </View>
    );
}

/** Top padding for a tab's content: below the status bar / notch of this phone, plus breathing room. */
export const useScreenTopInset = () => useSafeAreaInsets().top + spacing.md;
