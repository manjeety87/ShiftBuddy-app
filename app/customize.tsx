import { router } from 'expo-router';
import { CalendarDays, ListChecks, Users, type LucideIcon } from 'lucide-react-native';
import { ScrollView, Switch, View } from 'react-native';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { hideGettingStarted, showGettingStarted, useOnboarding } from '../lib/onboarding';
import { setCalendarSummary, setSharedSchedules, usePreferences } from '../lib/preferences';
import { useTheme } from '../lib/theme-context';

/** Choose what the screens show. Saved on this phone; each switch applies at once. */
export default function CustomizeScreen() {
    const { colors } = useTheme();
    const onboarding = useOnboarding();
    const preferences = usePreferences();

    const group = (label: string) => (
        <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4, marginTop: spacing.sm }}>{label}</ThemedText>
    );

    const toggle = (icon: LucideIcon, title: string, detail: string, value: boolean | undefined, onChange: (next: boolean) => void) => {
        const Icon = icon;
        return (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon color={colors.textSecondary} size={20} />
                <View style={{ flex: 1 }}>
                    <ThemedText weight="medium">{title}</ThemedText>
                    <ThemedText variant="secondary" size="xs">{detail}</ThemedText>
                </View>
                <Switch value={!!value} onValueChange={onChange} disabled={value === undefined} trackColor={{ true: colors.primary }} accessibilityLabel={title} />
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Customize" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="secondary" style={{ marginBottom: spacing.md, marginLeft: 4 }}>Choose what your screens show. Saved on this phone.</ThemedText>

                {group('HOME')}
                {toggle(
                    ListChecks,
                    'Getting started guide',
                    'The setup checklist on Home: a job, your shifts, your home address, your first clock-in. It goes away by itself once everything is done.',
                    onboarding ? !onboarding.guideHidden : undefined,
                    (shown) => (shown ? showGettingStarted() : hideGettingStarted()),
                )}

                {group('CALENDAR')}
                {toggle(
                    Users,
                    'Schedules shared with me',
                    'Above the calendar: the people who share their schedule with you. Off: they stay under Sharing.',
                    preferences?.sharedSchedules,
                    (shown) => setSharedSchedules(shown),
                )}
                {toggle(
                    CalendarDays,
                    'Hours & pay card',
                    'Under the calendar: shifts, hours and estimated pay for the week or month.',
                    preferences?.calendarSummary,
                    (shown) => setCalendarSummary(shown),
                )}
            </ScrollView>
        </View>
    );
}
