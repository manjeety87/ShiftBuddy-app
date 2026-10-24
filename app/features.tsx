import { router } from 'expo-router';
import { Check, ListChecks, PlayCircle } from 'lucide-react-native';
import { ScrollView, Switch, View } from 'react-native';
import { FeatureSwitches } from '../components/FeatureSwitches';
import { ListRow } from '../components/ui/ListRow';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { CALENDAR_FEATURES, CORE_FEATURES, EXTRA_FEATURES } from '../lib/features';
import { hideGettingStarted, showGettingStarted, useOnboarding } from '../lib/onboarding';
import { useTheme } from '../lib/theme-context';

/**
 * Everything ShiftBuddy does, in one place: what's always there, and the extras to
 * switch on when they're useful. Saved on the account, so the web app matches.
 */
export default function FeaturesScreen() {
    const { colors } = useTheme();
    const onboarding = useOnboarding();

    const heading = (label: string) => (
        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>{label}</ThemedText>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Features" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="secondary" style={{ marginBottom: spacing.lg, marginLeft: 4, lineHeight: 22 }}>
                    Your shifts and jobs are always here. Switch on the extras you need — they show up on your phone and on the web.
                </ThemedText>

                {heading('ALWAYS ON')}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg }}>
                    {CORE_FEATURES.map((item, index) => (
                        <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                            <View style={{ flex: 1 }}>
                                <ThemedText weight="medium">{item.title}</ThemedText>
                                <ThemedText variant="secondary" size="xs" style={{ lineHeight: 16 }}>{item.detail}</ThemedText>
                            </View>
                            <Check color={colors.success} size={18} accessibilityLabel="Always on" />
                        </View>
                    ))}
                </View>

                {heading('EXTRAS')}
                <FeatureSwitches items={EXTRA_FEATURES} />

                {heading('CALENDAR')}
                <FeatureSwitches items={CALENDAR_FEATURES} />

                {heading('HELP')}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                        <ListChecks color={colors.textSecondary} size={20} />
                        <View style={{ flex: 1 }}>
                            <ThemedText weight="medium">Getting started guide</ThemedText>
                            <ThemedText variant="secondary" size="xs" style={{ lineHeight: 16 }}>The setup checklist on Home. Saved on this phone.</ThemedText>
                        </View>
                        <Switch
                            value={onboarding ? !onboarding.guideHidden : false}
                            disabled={!onboarding}
                            onValueChange={(shown) => (shown ? showGettingStarted() : hideGettingStarted())}
                            trackColor={{ true: colors.primary }}
                            accessibilityLabel="Getting started guide"
                        />
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.surfaceLight }} />
                    <ListRow icon={PlayCircle} label="Show the Welcome Tour" onPress={() => router.push('/welcome?replay=1')} isFirst />
                </View>
            </ScrollView>
        </View>
    );
}
