import { useState } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Strong ease-out: the shrink starts immediately, which is what makes a press feel heard
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const PRESS_DURATION_MS = 120;

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
    /** A plain style object/array — never a function (NativeWind drops function styles on Pressable). */
    style?: StyleProp<ViewStyle>;
    /** Extra style while the finger is down, e.g. a row highlight or dimming. */
    pressedStyle?: StyleProp<ViewStyle>;
    /** Scale while pressed. 1 turns the shrink off (rows inside a list, links). */
    pressedScale?: number;
}

/**
 * The app's pressable. Feedback starts on press-in (not on release) and runs as
 * a Reanimated CSS transition on the UI thread, so it stays smooth while JS is busy.
 */
export function PressableScale({ style, pressedStyle, pressedScale = 0.97, onPressIn, onPressOut, ...props }: PressableScaleProps) {
    const [isPressed, setIsPressed] = useState(false);

    const handlePressIn = (event: GestureResponderEvent) => {
        setIsPressed(true);
        onPressIn?.(event);
    };
    const handlePressOut = (event: GestureResponderEvent) => {
        setIsPressed(false);
        onPressOut?.(event);
    };

    return (
        <AnimatedPressable
            pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
            {...props}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                style,
                isPressed && pressedStyle,
                {
                    transform: [{ scale: isPressed ? pressedScale : 1 }],
                    transitionProperty: 'transform',
                    transitionDuration: PRESS_DURATION_MS,
                    transitionTimingFunction: EASE_OUT,
                },
            ]}
        />
    );
}
