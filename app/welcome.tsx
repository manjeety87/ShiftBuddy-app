import { router, useLocalSearchParams } from 'expo-router';
import { Briefcase, ScanLine, Sparkles, Timer, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FeatureSwitches } from '../components/FeatureSwitches';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { EXTRA_FEATURES } from '../lib/features';
import { motion } from '../lib/motion';
import { markWelcomeSeen } from '../lib/onboarding';
import { useTheme } from '../lib/theme-context';

// What the app does, in the order a new person meets it. Same words as the web app's welcome.
// The last one hands over the extras, so the app starts out the size each person needs.
const SLIDES: { icon: LucideIcon; title: string; text: string; extras?: true }[] = [
    { icon: Briefcase, title: 'Every job in one place', text: 'Add each place you work once. Shifts from all your jobs then sit together on one calendar, each in its job’s colour.' },
    { icon: ScanLine, title: 'Add shifts your way', text: 'Type a shift in, or take a photo of the schedule at work. We read the shifts, you check them, then they’re saved.' },
    { icon: Timer, title: 'Know what’s next', text: 'Your next shift at a glance, and a heads-up when two shifts clash or you can’t get from one to the next in time.' },
    { icon: Sparkles, title: 'Make it yours', text: 'Switch on what you need. You can change these any time in Settings › Features.', extras: true },
];

/**
 * Short slides a brand-new account sees once on this phone, then Add Job: nothing
 * works until there is a job. Cancel also counts as seen. The "Getting started"
 * card on Home carries on from here. Settings › Features can replay it (`?replay=1`),
 * which ends with Done instead.
 */
export default function WelcomeScreen() {
    const { colors } = useTheme();
    const { replay } = useLocalSearchParams<{ replay?: string }>();
    const [index, setIndex] = useState(0);
    const slide = SLIDES[index];
    const isLast = index === SLIDES.length - 1;

    const close = () => {
        markWelcomeSeen();
        router.back();
    };

    const next = () => {
        if (!isLast) return setIndex(index + 1);
        markWelcomeSeen();
        if (replay) router.back();
        else router.replace('/create-job');
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Welcome" onCancel={close} />
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, justifyContent: 'center' }}>
                <Animated.View key={index} entering={motion.appear} style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                    <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, backgroundColor: withAlpha(colors.primary, 0.12) }}>
                        <slide.icon color={colors.primary} size={32} />
                    </View>
                    <ThemedText size="xl" weight="bold" style={{ textAlign: 'center', marginBottom: spacing.sm }}>{slide.title}</ThemedText>
                    <ThemedText variant="secondary" style={{ textAlign: 'center', lineHeight: 22 }}>{slide.text}</ThemedText>
                </Animated.View>
                {slide.extras && (
                    <Animated.View entering={motion.appear}>
                        <FeatureSwitches items={EXTRA_FEATURES} />
                    </Animated.View>
                )}

                <View accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.xl }}>
                    {SLIDES.map((item, dot) => (
                        <PressableScale
                            key={item.title}
                            onPress={() => setIndex(dot)}
                            accessibilityRole="button"
                            accessibilityLabel={`Show step ${dot + 1}`}
                            hitSlop={10}
                            style={{ width: dot === index ? 20 : 6, height: 6, borderRadius: radius.full, backgroundColor: dot === index ? colors.primary : colors.surfaceLight }}
                        />
                    ))}
                </View>

                <Button label={!isLast ? 'Next' : replay ? 'Done' : 'Add Your First Job'} onPress={next} />
            </ScrollView>
        </View>
    );
}
