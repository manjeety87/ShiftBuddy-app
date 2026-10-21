import { router } from 'expo-router';
import { Briefcase, ScanLine, Timer, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { motion } from '../lib/motion';
import { markWelcomeSeen } from '../lib/onboarding';
import { useTheme } from '../lib/theme-context';

// What the app does, in the order a new person meets it. Same words as the web app's welcome.
const SLIDES: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Briefcase, title: 'Every job in one place', text: 'Add each place you work once. Shifts from all your jobs then sit together on one calendar, each in its job’s colour.' },
    { icon: ScanLine, title: 'Add shifts your way', text: 'Type a shift in, or take a photo of the schedule at work. We read the shifts, you check them, then they’re saved.' },
    { icon: Timer, title: 'Know what’s next', text: 'See your next shift, shifts that clash, when to leave, and clock in and out to track the hours you really worked and what you’ll earn.' },
];

/**
 * Three short slides a brand-new account sees once on this phone, then Add Job:
 * nothing works until there is a job. Cancel also counts as seen. The
 * "Getting started" card on Home carries on from here.
 */
export default function WelcomeScreen() {
    const { colors } = useTheme();
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
        router.replace('/create-job');
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

                <Button label={isLast ? 'Add Your First Job' : 'Next'} onPress={next} />
            </ScrollView>
        </View>
    );
}
