import { View, type ViewProps } from 'react-native';
import { radius, spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

interface CardProps extends ViewProps {
    accentColor?: string; // left border ke liye — Job/Shift cards me use hoga
}

export function Card({ style, accentColor, children, ...props }: CardProps) {
    const { colors } = useTheme();
    return (
        <View
            style={[
                {
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    borderLeftWidth: accentColor ? 4 : 0,
                    borderLeftColor: accentColor,
                },
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}