import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { radius, spacing } from '../../constants/themes';
import { subscribeToDialogs, type DialogButton, type DialogRequest } from '../../lib/dialog';
import { useTheme } from '../../lib/theme-context';
import { PressableScale } from './PressableScale';
import { ThemedText } from './ThemedText';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const ENTER_MS = 180;
const EXIT_MS = 140;
const MAX_WIDTH = 340;

/**
 * Renders `showAlert(...)` requests as a themed card. Lives in the root layout,
 * inside a RN Modal so it sits above native sheets too. Appears with a fade +
 * slight scale from the centre (a dialog isn't anchored to any button), leaves
 * the same way, then runs the chosen button's handler.
 */
export function DialogHost() {
    const { colors } = useTheme();
    const reduceMotion = useReducedMotion();
    const { width } = useWindowDimensions();
    const queue = useRef<DialogRequest[]>([]);
    const [current, setCurrent] = useState<DialogRequest | null>(null);
    const [isShown, setIsShown] = useState(false);
    const closing = useRef(false);

    const showNext = useCallback(() => {
        const next = queue.current.shift() ?? null;
        closing.current = false;
        setCurrent(next);
        setIsShown(false);
    }, []);

    useEffect(
        () =>
            subscribeToDialogs((request) => {
                queue.current.push(request);
                setCurrent((active) => {
                    if (active) return active; // shown after the current one closes
                    return queue.current.shift() ?? null;
                });
            }),
        []
    );

    // Flip to the "shown" style one frame after mounting, so the transition runs
    useEffect(() => {
        if (!current) return;
        const frame = requestAnimationFrame(() => setIsShown(true));
        return () => cancelAnimationFrame(frame);
    }, [current]);

    const close = (after?: () => void) => {
        if (closing.current) return;
        closing.current = true;
        setIsShown(false);
        setTimeout(() => {
            showNext();
            after?.();
        }, reduceMotion ? 0 : EXIT_MS);
    };

    if (!current) return null;

    const { buttons, options } = current;
    const cancelButton = buttons.find((b) => b.style === 'cancel');
    const canDismiss = options.cancelable !== false;
    const dismiss = () => {
        if (!canDismiss) return;
        close(() => {
            cancelButton?.onPress?.();
            options.onDismiss?.();
        });
    };

    // Two buttons sit side by side (cancel first); more stack, cancel last
    const sideBySide = buttons.length <= 2;
    const ordered = sideBySide
        ? [...buttons].sort((a, b) => (a.style === 'cancel' ? -1 : b.style === 'cancel' ? 1 : 0))
        : [...buttons].sort((a, b) => (a.style === 'cancel' ? 1 : b.style === 'cancel' ? -1 : 0));

    const buttonColors = (button: DialogButton, isOnly: boolean) => {
        if (button.style === 'destructive') return { background: colors.danger, text: '#FFFFFF' };
        if (button.style === 'cancel') return { background: colors.surfaceLight, text: colors.textPrimary };
        // The main action is filled; secondary actions in a 3+ stack stay quiet
        if (isOnly || sideBySide || button === ordered[0]) return { background: colors.primary, text: colors.onPrimary };
        return { background: colors.surfaceLight, text: colors.textPrimary };
    };

    const transition = {
        transitionProperty: ['opacity', 'transform'],
        transitionDuration: reduceMotion ? 0 : isShown ? ENTER_MS : EXIT_MS,
        transitionTimingFunction: EASE_OUT,
    };

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
            <Animated.View
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)', opacity: isShown ? 1 : 0, ...transition }}
            >
                <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={dismiss} accessibilityLabel="Close" />
                <Animated.View
                    accessibilityViewIsModal
                    accessibilityRole="alert"
                    style={{
                        width: Math.min(MAX_WIDTH, width - spacing.lg * 2),
                        backgroundColor: colors.surface,
                        borderRadius: 20,
                        padding: spacing.lg,
                        shadowColor: '#000',
                        shadowOpacity: 0.2,
                        shadowRadius: 24,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: 12,
                        opacity: isShown ? 1 : 0,
                        transform: [{ scale: isShown ? 1 : 0.96 }],
                        ...transition,
                    }}
                >
                    <ThemedText size="lg" weight="bold" style={{ textAlign: 'center' }}>{current.title}</ThemedText>
                    {current.message ? (
                        <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 }}>
                            {current.message}
                        </ThemedText>
                    ) : null}

                    <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: spacing.sm, marginTop: spacing.lg }}>
                        {ordered.map((button) => {
                            const tone = buttonColors(button, buttons.length === 1);
                            return (
                                <PressableScale
                                    key={button.text}
                                    onPress={() => close(button.onPress)}
                                    accessibilityRole="button"
                                    style={{ flex: sideBySide ? 1 : undefined, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, backgroundColor: tone.background }}
                                >
                                    <ThemedText weight="semibold" color={tone.text} numberOfLines={1}>{button.text}</ThemedText>
                                </PressableScale>
                            );
                        })}
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}
