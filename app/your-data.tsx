import { router } from 'expo-router';
import { Download, Trash2, Users, type LucideIcon } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { useTheme } from '../lib/theme-context';

/** Your data is yours: keep a record, choose who sees it, or delete it. */
export default function YourDataScreen() {
    const { colors } = useTheme();
    const row = (icon: LucideIcon, title: string, detail: string, onPress: () => void, options: { isFirst?: boolean; danger?: boolean } = {}) => {
        const Icon = icon;
        const tint = options.danger ? colors.danger : colors.textPrimary;
        return (
            <PressableScale
                onPress={onPress}
                accessibilityRole="button"
                pressedScale={1}
                pressedStyle={{ backgroundColor: colors.surfaceLight }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: options.isFirst ? 0 : 1, borderTopColor: colors.surfaceLight }}
            >
                <Icon color={options.danger ? colors.danger : colors.textSecondary} size={20} />
                <View style={{ flex: 1 }}>
                    <ThemedText weight="medium" color={tint}>{title}</ThemedText>
                    <ThemedText variant="secondary" size="xs">{detail}</ThemedText>
                </View>
            </PressableScale>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Your Data" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="secondary" style={{ marginBottom: spacing.md, marginLeft: 4 }}>It’s yours: keep a record, choose who sees it, or delete it.</ThemedText>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg }}>
                    {row(Download, 'Shift statement', 'Every shift you worked for a week, a month, three months or any dates, as a PDF.', () => router.push('/statement'), { isFirst: true })}
                    {row(Users, 'Who sees your schedule', 'People you share your shifts with, and for how long.', () => router.push('/sharing'))}
                </View>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    {row(Trash2, 'Delete Account', 'You have 30 days to change your mind. After that, everything is erased.', () => router.push('/delete-account'), { isFirst: true, danger: true })}
                </View>
            </ScrollView>
        </View>
    );
}
