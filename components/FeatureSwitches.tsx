import { Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '../constants/themes';
import type { FeatureKey } from '../interfaces/user.d';
import { useAuth } from '../lib/auth-context';
import { featuresOf, setFeature, type FeatureInfo } from '../lib/features';
import { motion } from '../lib/motion';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';
import { ThemedText } from './ui/ThemedText';

/**
 * Switch account features on and off. The switch moves at once (a control that waits
 * for the server feels broken) and goes back if saving fails.
 */
export function useFeatureToggle() {
    const { user, refreshUser } = useAuth();
    const features = featuresOf(user);

    const toggle = async (key: FeatureKey, on: boolean) => {
        if (!user) return;
        refreshUser({ ...user, features: { ...features, [key]: on } });
        try {
            refreshUser(await setFeature(key, on));
        } catch (err: any) {
            refreshUser(user);
            notify.error('Couldn’t save that', { description: err?.response?.data?.message });
        }
    };

    return { features, toggle };
}

/**
 * Features as one grouped card: a row each, with its switch. A feature that needs
 * another (Add my hours → Clock in) sits indented under it and shows only while that one is on.
 */
export function FeatureSwitches({ items }: { items: FeatureInfo[] }) {
    const { colors } = useTheme();
    const { features, toggle } = useFeatureToggle();
    const shown = items.filter((item) => !item.requires || features[item.requires]);

    return (
        <Animated.View layout={motion.layout} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg }}>
            {shown.map((item, index) => (
                <Animated.View
                    key={item.key}
                    entering={motion.appear}
                    exiting={motion.disappear}
                    layout={motion.layout}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingVertical: spacing.md,
                        paddingRight: spacing.md,
                        paddingLeft: item.requires ? spacing.xl : spacing.md,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.surfaceLight,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <ThemedText weight="medium">{item.title}</ThemedText>
                        <ThemedText variant="secondary" size="xs" style={{ lineHeight: 16 }}>{item.detail}</ThemedText>
                    </View>
                    <Switch value={features[item.key]} onValueChange={(on) => toggle(item.key, on)} trackColor={{ true: colors.primary }} accessibilityLabel={item.title} />
                </Animated.View>
            ))}
        </Animated.View>
    );
}
