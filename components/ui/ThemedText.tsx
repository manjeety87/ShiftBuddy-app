import { Text, type TextProps } from 'react-native';
import { fontSize as fontSizes } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

type Variant = 'primary' | 'secondary' | 'muted';
type Size = keyof typeof fontSizes;

interface ThemedTextProps extends TextProps {
    variant?: Variant;
    size?: Size;
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    color?: string; // manual override — jaise status colors (success/danger)
}

export function ThemedText({ variant = 'primary', size = 'base', weight = 'normal', color, style, ...props }: ThemedTextProps) {
    const { colors, fontScale } = useTheme();

    const variantColor = variant === 'primary' ? colors.textPrimary : variant === 'secondary' ? colors.textSecondary : colors.textMuted;

    const fontWeightMap = { normal: '400', medium: '500', semibold: '600', bold: '700' } as const;

    return (
        <Text
            style={[
                {
                    color: color || variantColor,
                    fontSize: fontSizes[size] * fontScale,
                    fontWeight: fontWeightMap[weight],
                },
                style,
            ]}
            {...props}
        />
    );
}