import { createChangeSignal } from './changeSignal';
import { keyValueStore } from './keyValueStore';
import { useFetch } from './useFetch';

// What a new person has seen of the guide, on this phone. Not account data: the
// web app keeps its own copy in the browser, the same way it keeps its theme.
const WELCOME_SEEN_KEY = 'shiftbuddy.welcomeSeen';
const GUIDE_HIDDEN_KEY = 'shiftbuddy.gettingStartedHidden';

const onboardingChanged = createChangeSignal();

interface OnboardingState {
    welcomeSeen: boolean;
    guideHidden: boolean;
}

const readOnboarding = async (): Promise<OnboardingState> => {
    const [welcome, hidden] = await Promise.all([keyValueStore.getItem(WELCOME_SEEN_KEY), keyValueStore.getItem(GUIDE_HIDDEN_KEY)]);
    return { welcomeSeen: welcome === 'yes', guideHidden: hidden === 'yes' };
};

/** `null` until read from storage, so Home never shows the card and then hides it. */
export const useOnboarding = () => {
    const { data, refetch } = useFetch(readOnboarding);
    onboardingChanged.useChanged(refetch);
    return data;
};

export const markWelcomeSeen = async () => {
    await keyValueStore.setItem(WELCOME_SEEN_KEY, 'yes');
    onboardingChanged.emit();
};

export const hideGettingStarted = async () => {
    await keyValueStore.setItem(GUIDE_HIDDEN_KEY, 'yes');
    onboardingChanged.emit();
};

/** Settings › Customize: bring the guide back (it still goes away by itself once every step is done). */
export const showGettingStarted = async () => {
    await keyValueStore.deleteItem(GUIDE_HIDDEN_KEY);
    onboardingChanged.emit();
};
