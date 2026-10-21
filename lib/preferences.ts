import { createChangeSignal } from './changeSignal';
import { keyValueStore } from './keyValueStore';
import { useFetch } from './useFetch';

// How this phone likes the app laid out (Settings › Customize). Not account data:
// the web app keeps its own copy in the browser, the same way it keeps its theme.
const CALENDAR_SUMMARY_KEY = 'shiftbuddy.calendarSummary';

const preferencesChanged = createChangeSignal();

export interface DisplayPreferences {
    /** Calendar's hours-and-pay card under the month */
    calendarSummary: boolean;
}

const readPreferences = async (): Promise<DisplayPreferences> => ({
    calendarSummary: (await keyValueStore.getItem(CALENDAR_SUMMARY_KEY)) !== 'off',
});

/** `null` until read from storage, so a screen never shows a card and then hides it. */
export const usePreferences = () => {
    const { data, refetch } = useFetch(readPreferences);
    preferencesChanged.useChanged(refetch);
    return data;
};

export const setCalendarSummary = async (shown: boolean) => {
    await keyValueStore.setItem(CALENDAR_SUMMARY_KEY, shown ? 'on' : 'off');
    preferencesChanged.emit();
};
