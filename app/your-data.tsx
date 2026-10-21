import { router } from 'expo-router';
import { Download, Trash2, Users, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { shareMyData } from '../lib/exportData';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';

/** Your data is yours: take a copy, choose who sees it, or delete it. */
export default function YourDataScreen() {
    const { colors } = useTheme();
    const [isExporting, setIsExporting] = useState(false);

    const download = async () => {
        setIsExporting(true);
        try {
            await shareMyData();
        } catch (err: any) {
            notify.error('Couldn’t prepare your data', { description: err?.response?.data?.message ?? err?.message });
        } finally {
            setIsExporting(false);
        }
    };

    const row = (icon: LucideIcon, title: string, detail: string, onPress: () => void, options: { isFirst?: boolean; danger?: boolean; busy?: boolean } = {}) => {
        const Icon = icon;
        const tint = options.danger ? colors.danger : colors.textPrimary;
        return (
            <PressableScale
                onPress={onPress}
                disabled={options.busy}
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
                {options.busy && <ActivityIndicator color={colors.primary} />}
            </PressableScale>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Your Data" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="secondary" style={{ marginBottom: spacing.md, marginLeft: 4 }}>It’s yours: take a copy, choose who sees it, or delete it.</ThemedText>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg }}>
                    {row(Download, 'Download your data', 'Your profile, jobs, shifts, hours and sharing, as a file you can save or send.', download, { isFirst: true, busy: isExporting })}
                    {row(Users, 'Who sees your schedule', 'People you share your shifts with, and for how long.', () => router.push('/sharing'))}
                </View>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    {row(Trash2, 'Delete Account', 'You have 30 days to change your mind. After that, everything is erased.', () => router.push('/delete-account'), { isFirst: true, danger: true })}
                </View>
            </ScrollView>
        </View>
    );
}
