import { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

// One place for in-screen motion timings (sheets and screens use native transitions).
// Layout animations follow the system "reduce motion" setting by default.

/** Strong ease-out for anything entering or reacting — starts fast, so it feels immediate */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

export const motion = {
    /** Something appears that wasn't there (banner, empty state) */
    appear: FadeIn.duration(200).easing(EASE_OUT),
    /** …and leaves */
    disappear: FadeOut.duration(150).easing(EASE_OUT),
    /** Content swapped in place many times a day (day switch, week/month) — barely there */
    swap: FadeIn.duration(140).easing(EASE_OUT),
    /** Siblings sliding to make room when something above appears or goes */
    layout: LinearTransition.duration(220).easing(EASE_IN_OUT),
};
