import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';
import { radius, spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import { ThemedText } from './ThemedText';
import { PressableScale } from './PressableScale';

export interface IconAction {
    icon: LucideIcon;
    label: string;
    onPress: () => void;
    destructive?: boolean;
    busy?: boolean;
    disabled?: boolean;
}

/**
 * Secondary actions for a sheet as a quiet row of labelled icons, below the
 * form — the sheet's header keeps the only prominent actions (Cancel / Save).
 */
export function IconActionBar({ actions }: { actions: IconAction[] }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl }}>
            {actions.map((action) => {
                const color = action.destructive ? colors.danger : colors.textSecondary;
                return (
                    <PressableScale
                        key={action.label}
                        onPress={action.onPress}
                        disabled={action.disabled || action.busy}
                        accessibilityRole="button"
                        accessibilityLabel={action.label}
                        hitSlop={6}
                        pressedScale={0.94}
                        style={{ alignItems: 'center', gap: 6, opacity: action.disabled ? 0.4 : 1 }}
                    >
                        <View style={{ width: 48, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
                            {action.busy ? <ActivityIndicator size="small" color={color} /> : <action.icon color={color} size={20} />}
                        </View>
                        <ThemedText size="xs" color={color}>{action.label}</ThemedText>
                    </PressableScale>
                );
            })}
        </View>
    );
}
