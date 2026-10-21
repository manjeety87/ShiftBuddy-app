import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import { PressableScale } from './PressableScale';
import { ThemedText } from './ThemedText';

interface ListRowProps {
    icon: LucideIcon;
    label: string;
    detail?: string;
    onPress: () => void;
    /** Rows after the first draw a hairline above themselves */
    isFirst?: boolean;
}

/** A settings-style row inside a grouped card: highlights while pressed, chevron says "opens something". */
export function ListRow({ icon: Icon, label, detail, onPress, isFirst }: ListRowProps) {
    const { colors } = useTheme();
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={detail ? `${label}, ${detail}` : label}
            pressedScale={1}
            pressedStyle={{ backgroundColor: colors.surfaceLight }}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                borderTopWidth: isFirst ? 0 : 1,
                borderTopColor: colors.surfaceLight,
            }}
        >
            <Icon color={colors.textSecondary} size={20} />
            <View style={{ flex: 1 }}>
                <ThemedText>{label}</ThemedText>
                {!!detail && <ThemedText variant="muted" size="xs">{detail}</ThemedText>}
            </View>
            <ChevronRight color={colors.textMuted} size={18} />
        </PressableScale>
    );
}
