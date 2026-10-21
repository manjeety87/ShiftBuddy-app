import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { radius } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import { PressableScale } from './PressableScale';
import { ThemedText } from './ThemedText';

// The thumb moves across the control, so it eases in and out (not just out)
const EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);
const SLIDE_MS = 200;
const PADDING = 3;

export interface SegmentOption<T extends string> {
    value: T;
    label: string;
}

interface SegmentedControlProps<T extends string> {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    size?: 'sm' | 'md';
    accessibilityLabel?: string;
}

/**
 * iOS-style segmented control: a white thumb slides to the chosen segment
 * (transform only, on the UI thread) with a light selection haptic.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md', accessibilityLabel }: SegmentedControlProps<T>) {
    const { colors } = useTheme();
    const reduceMotion = useReducedMotion();
    const [width, setWidth] = useState(0);
    const segmentWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;
    const index = Math.max(0, options.findIndex((o) => o.value === value));

    const select = (next: T) => {
        if (next === value) return;
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onChange(next);
    };

    return (
        <View
            accessibilityRole="tablist"
            accessibilityLabel={accessibilityLabel}
            onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
            style={{ flexDirection: 'row', padding: PADDING, borderRadius: radius.md, backgroundColor: colors.surfaceLight }}
        >
            {segmentWidth > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: PADDING,
                        bottom: PADDING,
                        left: PADDING,
                        width: segmentWidth,
                        borderRadius: radius.sm,
                        backgroundColor: colors.surface,
                        shadowColor: '#000',
                        shadowOpacity: 0.08,
                        shadowRadius: 3,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: 1,
                        transform: [{ translateX: index * segmentWidth }],
                        transitionProperty: 'transform',
                        transitionDuration: reduceMotion ? 0 : SLIDE_MS,
                        transitionTimingFunction: EASE_IN_OUT,
                    }}
                />
            )}
            {options.map((option) => {
                const isOn = option.value === value;
                return (
                    <PressableScale
                        key={option.value}
                        onPress={() => select(option.value)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isOn }}
                        pressedScale={1}
                        pressedStyle={{ opacity: 0.6 }}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: size === 'sm' ? 5 : 8, paddingHorizontal: 8 }}
                    >
                        <ThemedText size={size === 'sm' ? 'xs' : 'sm'} weight={isOn ? 'semibold' : 'medium'} color={isOn ? colors.textPrimary : colors.textSecondary} numberOfLines={1}>
                            {option.label}
                        </ThemedText>
                    </PressableScale>
                );
            })}
        </View>
    );
}
