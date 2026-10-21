import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { radius } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

export const WHEEL_ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5; // odd, so one row sits in the middle
const SIDE_ROWS = (VISIBLE_ITEMS - 1) / 2;

export interface WheelItem<T> {
    label: string;
    value: T;
}

function WheelRow({ label, index, scrollY }: { label: string; index: number; scrollY: SharedValue<number> }) {
    const { colors } = useTheme();
    // Rows curve away from the middle like a drum: tilt, shrink and fade with distance
    const style = useAnimatedStyle(() => {
        const distance = scrollY.value / WHEEL_ITEM_HEIGHT - index;
        return {
            opacity: interpolate(Math.abs(distance), [0, 1, 2, 3], [1, 0.55, 0.25, 0], Extrapolation.CLAMP),
            transform: [
                { perspective: 600 },
                { rotateX: `${interpolate(distance, [-3, 0, 3], [70, 0, -70], Extrapolation.CLAMP)}deg` },
                { scale: interpolate(Math.abs(distance), [0, 2], [1, 0.88], Extrapolation.CLAMP) },
            ],
        };
    });
    return (
        <Animated.View style={[{ height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }, style]}>
            <Animated.Text style={{ fontSize: 21, color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{label}</Animated.Text>
        </Animated.View>
    );
}

interface WheelPickerProps<T> {
    items: WheelItem<T>[];
    selectedIndex: number;
    onChange: (index: number) => void;
    width: number;
}

/**
 * One column of an iOS-style wheel: snaps row by row, curves like a drum, and
 * ticks a light haptic as each row passes the middle. Reports the settled row.
 */
export function WheelPicker<T>({ items, selectedIndex, onChange, width }: WheelPickerProps<T>) {
    const scrollY = useSharedValue(selectedIndex * WHEEL_ITEM_HEIGHT);
    const scrollRef = useRef<Animated.ScrollView>(null);
    const lastReported = useRef(selectedIndex);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    // A tick each time a new row crosses the middle (not on every pixel)
    useAnimatedReaction(
        () => Math.round(scrollY.value / WHEEL_ITEM_HEIGHT),
        (row, previous) => {
            if (previous !== null && row !== previous && Platform.OS !== 'web') {
                scheduleOnRN(Haptics.selectionAsync);
            }
        }
    );

    // Follow outside changes (e.g. the sheet reopening on another value)
    useEffect(() => {
        if (selectedIndex === lastReported.current) return;
        lastReported.current = selectedIndex;
        scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
    }, [selectedIndex]);

    const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.min(items.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT)));
        if (index !== lastReported.current) {
            lastReported.current = index;
            onChange(index);
        }
    };

    return (
        <View style={{ width, height: WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS }}>
            <Animated.ScrollView
                ref={scrollRef}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_HEIGHT}
                decelerationRate="fast"
                contentOffset={{ x: 0, y: selectedIndex * WHEEL_ITEM_HEIGHT }}
                contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * SIDE_ROWS }}
                onMomentumScrollEnd={settle}
                // A slow drag that stops without momentum never fires onMomentumScrollEnd
                onScrollEndDrag={(e) => { if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e); }}
                nestedScrollEnabled
            >
                {items.map((item, index) => (
                    <WheelRow key={`${item.label}-${index}`} label={item.label} index={index} scrollY={scrollY} />
                ))}
            </Animated.ScrollView>
        </View>
    );
}

/** The rounded band behind the middle row of a set of wheels. */
export function WheelSelectionBand() {
    const { colors } = useTheme();
    return (
        <View
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: 8,
                right: 8,
                top: WHEEL_ITEM_HEIGHT * SIDE_ROWS,
                height: WHEEL_ITEM_HEIGHT,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceLight,
            }}
        />
    );
}
