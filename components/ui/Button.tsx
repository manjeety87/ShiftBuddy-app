import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, spacing } from '../../constants/themes';
import { withAlpha } from '../../lib/color';
import { useTheme } from '../../lib/theme-context';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { ThemedText } from './ThemedText';

// The app's three kinds of pressable, so every button looks and responds the same:
//   Button      — a full-size action (Save, Log In, Share…)
//   TextButton  — a word or two in the accent colour (Cancel, Today, Forgot password?)
//   IconButton  — a round icon (close ×, previous/next week)

type Variant = 'primary' | 'secondary' | 'tinted' | 'danger';

interface ButtonProps extends Omit<PressableScaleProps, 'children' | 'style'> {
    label: string;
    variant?: Variant;
    icon?: LucideIcon;
    isLoading?: boolean;
    style?: StyleProp<ViewStyle>;
}

/** primary = the one main action · tinted = a softer accent action · secondary = quiet · danger = destructive */
export function Button({ label, variant = 'primary', icon: Icon, isLoading, disabled, style, ...props }: ButtonProps) {
    const { colors } = useTheme();
    const palette: Record<Variant, { background: string; text: string }> = {
        primary: { background: colors.primary, text: colors.onPrimary },
        secondary: { background: colors.surface, text: colors.primary },
        tinted: { background: withAlpha(colors.primary, 0.12), text: colors.primary },
        danger: { background: withAlpha(colors.danger, 0.12), text: colors.danger },
    };
    const { background, text } = palette[variant];
    const isDisabled = disabled || isLoading;

    return (
        <PressableScale
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !!isDisabled, busy: !!isLoading }}
            disabled={isDisabled}
            style={[
                {
                    height: 48,
                    borderRadius: radius.md,
                    backgroundColor: background,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    opacity: disabled && !isLoading ? 0.45 : 1,
                },
                style,
            ]}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator color={text} />
            ) : (
                <>
                    {Icon && <Icon color={text} size={18} />}
                    <ThemedText weight="semibold" color={text} numberOfLines={1}>{label}</ThemedText>
                </>
            )}
        </PressableScale>
    );
}

interface TextButtonProps extends Omit<PressableScaleProps, 'children'> {
    label: string;
    color?: string;
    size?: 'xs' | 'sm' | 'base';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    icon?: LucideIcon;
}

/** Words that act. Dims on press instead of shrinking — text scaling looks jittery. */
export function TextButton({ label, color, size = 'base', weight = 'semibold', icon: Icon, style, hitSlop = 10, ...props }: TextButtonProps) {
    const { colors } = useTheme();
    const tint = color ?? colors.primary;
    return (
        <PressableScale
            accessibilityRole="button"
            hitSlop={hitSlop}
            pressedScale={1}
            pressedStyle={{ opacity: 0.5 }}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}
            {...props}
        >
            {Icon && <Icon color={tint} size={size === 'base' ? 16 : 14} />}
            <ThemedText color={tint} size={size} weight={weight}>{label}</ThemedText>
        </PressableScale>
    );
}

interface IconButtonProps extends Omit<PressableScaleProps, 'children'> {
    icon: LucideIcon;
    /** Required: it's the only name a screen reader gets */
    accessibilityLabel: string;
    color?: string;
    size?: number;
    /** 'filled' = a round surface behind the icon; 'plain' = just the icon */
    appearance?: 'filled' | 'plain';
}

/** A round icon control. Keeps a 44pt touch target even when the visual is smaller. */
export function IconButton({ icon: Icon, color, size = 36, appearance = 'filled', style, hitSlop, ...props }: IconButtonProps) {
    const { colors } = useTheme();
    const extra = Math.max(0, (44 - size) / 2);
    return (
        <PressableScale
            accessibilityRole="button"
            hitSlop={hitSlop ?? extra}
            pressedScale={0.92}
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: appearance === 'filled' ? colors.surface : 'transparent',
                },
                style,
            ]}
            {...props}
        >
            <View>
                <Icon color={color ?? (appearance === 'filled' ? colors.textPrimary : colors.primary)} size={Math.round(size * 0.5)} />
            </View>
        </PressableScale>
    );
}
