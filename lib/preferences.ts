import { createChangeSignal } from './changeSignal';
import { keyValueStore } from './keyValueStore';
import { useFetch } from './useFetch';

// How this phone likes the app laid out (Settings › Customize). Not account data:
// the web app keeps its own copy in the browser, the same way it keeps its theme.
const CALENDAR_SUMMARY_KEY = 'shiftbuddy.calendarSummary';
const SHARED_KEY = 'shiftbuddy.sharedOnCalendar';

const preferencesChanged = createChangeSignal();

export interface DisplayPreferences {
    /** Calendar's hours-and-pay card under the month */
    calendarSummary: boolean;
    /** Calendar's row of people who share their schedule with you */
    sharedSchedules: boolean;
}

const readPreferences = async (): Promise<DisplayPreferences> => {
    const [summary, shared] = await Promise.all([keyValueStore.getItem(CALENDAR_SUMMARY_KEY), keyValueStore.getItem(SHARED_KEY)]);
    return { calendarSummary: summary !== 'off', sharedSchedules: shared !== 'off' };
};

/** `null` until read from storage, so a screen never shows a card and then hides it. */
export const usePreferences = () => {
    const { data, refetch } = useFetch(readPreferences);
    preferencesChanged.useChanged(refetch);
    return data;
};

export const setSharedSchedules = async (shown: boolean) => {
    await keyValueStore.setItem(SHARED_KEY, shown ? 'on' : 'off');
    preferencesChanged.emit();
};

export const setCalendarSummary = async (shown: boolean) => {
    await keyValueStore.setItem(CALENDAR_SUMMARY_KEY, shown ? 'on' : 'off');
    preferencesChanged.emit();
};
