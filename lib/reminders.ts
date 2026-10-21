import { Platform } from 'react-native';
import type { Shift } from '../interfaces/shift.d';
import { api } from './api';
import { formatTime } from './dateUtils';
import { keyValueStore } from './keyValueStore';
import { Notifications } from './notifications';
import { jobName, jobRole } from './jobLabels';

type NotificationsApi = NonNullable<typeof Notifications>;

// Local notifications scheduled on this device — no push server involved, so
// this works in Expo Go on iOS (Android needs the installed app, see ./notifications). Every time shifts or settings change we cancel
// our scheduled reminders and rebuild them from the upcoming shifts.

export const LEAD_TIME_OPTIONS = [15, 30, 60, 120] as const;
export type LeadMinutes = (typeof LEAD_TIME_OPTIONS)[number];

// How long before the day's first shift to wake up — getting ready plus the commute
export const WAKE_UP_OPTIONS = [60, 90, 120, 150, 180] as const;
export type WakeUpMinutes = (typeof WAKE_UP_OPTIONS)[number];

export interface WakeUpSettings {
    enabled: boolean;
    leadMinutes: WakeUpMinutes;
}

export interface ReminderSettings {
    enabled: boolean;
    defaultLeadMinutes: LeadMinutes;
    /** Per-job override; a job missing here uses the default. */
    jobLeadMinutes: Record<string, LeadMinutes | 'off'>;
    /** Alarm-style notification before the first shift of each day — independent of reminders. */
    wakeUp: WakeUpSettings;
}

const SETTINGS_KEY = 'shiftbuddy_reminder_settings';
const CHANNEL_ID = 'shift-reminders';
const ALARM_CHANNEL_ID = 'shift-alarms';
const ID_PREFIX = 'shift-reminder:';
const ALARM_ID_PREFIX = 'shift-alarm:';
const ALARM_VIBRATION = [0, 800, 400, 800, 400, 800];
// iOS keeps at most 64 pending local notifications per app; leave headroom.
const MAX_SCHEDULED = 50;

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
    enabled: false,
    defaultLeadMinutes: 60,
    jobLeadMinutes: {},
    wakeUp: { enabled: false, leadMinutes: 90 },
};

export const formatLeadTime = (minutes: number) =>
    minutes < 60 ? `${minutes} min` : `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;

/** Call once at startup: how reminders look while the app is open, plus the Android channel. */
export const configureNotifications = () => {
    if (!Notifications) return;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Shift reminders',
            importance: Notifications.AndroidImportance.HIGH,
        }).catch((err) => console.warn('Could not create notification channel', err));
        // Its own channel so it can be loud and buzz long; the user controls it separately in system settings
        Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
            name: 'Wake-up alarms',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: ALARM_VIBRATION,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
        }).catch((err) => console.warn('Could not create alarm channel', err));
    }
};

export const getReminderSettings = async (): Promise<ReminderSettings> => {
    try {
        const raw = await keyValueStore.getItem(SETTINGS_KEY);
        if (!raw) return DEFAULT_REMINDER_SETTINGS;
        const saved = JSON.parse(raw);
        // Settings saved before wake-up alarms existed have no `wakeUp`
        return { ...DEFAULT_REMINDER_SETTINGS, ...saved, wakeUp: { ...DEFAULT_REMINDER_SETTINGS.wakeUp, ...saved.wakeUp } };
    } catch {
        return DEFAULT_REMINDER_SETTINGS;
    }
};

export const saveReminderSettings = async (settings: ReminderSettings) => {
    await keyValueStore.setItem(SETTINGS_KEY, JSON.stringify(settings));
    requestReminderSync();
};

/** 'granted' | 'denied' — asks the OS only if the user hasn't answered yet. */
export const ensureNotificationPermission = async (): Promise<'granted' | 'denied'> => {
    if (!Notifications) return 'denied';
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted ? 'granted' : 'denied';
};

export const cancelAllReminders = async () => {
    const notifications = Notifications;
    if (!notifications) return;
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
        scheduled
            .filter((n) => n.identifier.startsWith(ID_PREFIX) || n.identifier.startsWith(ALARM_ID_PREFIX))
            .map((n) => notifications.cancelScheduledNotificationAsync(n.identifier))
    );
};

const leadMinutesFor = (shift: Shift, settings: ReminderSettings) => {
    const override = settings.jobLeadMinutes[shift.jobId];
    return override ?? settings.defaultLeadMinutes;
};

const scheduleReminder = (notifications: NotificationsApi, shift: Shift, lead: LeadMinutes, fireAt: Date) => {
    const place = shift.job.location ? ` · ${shift.job.location}` : '';
    return notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${shift.id}`,
        content: {
            title: `${jobName(shift.job)} in ${formatLeadTime(lead)}`,
            body: `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} at ${shift.job.companyName}${place}`,
            data: { shiftId: shift.id },
        },
        trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNEL_ID },
    });
};

export interface WakeUpAlarm {
    shift: Shift;
    fireAt: Date;
}

/** One alarm per day, before that day's first shift — later shifts that day don't need waking up for. */
export const planWakeUpAlarms = (shifts: Shift[], wakeUp: WakeUpSettings, now = Date.now()): WakeUpAlarm[] => {
    if (!wakeUp.enabled) return [];
    const firstShiftByDay = new Map<string, Shift>();
    [...shifts]
        .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
        .forEach((shift) => {
            const day = new Date(shift.startTime).toDateString();
            if (!firstShiftByDay.has(day)) firstShiftByDay.set(day, shift);
        });
    return [...firstShiftByDay.values()]
        .map((shift) => ({ shift, fireAt: new Date(Date.parse(shift.startTime) - wakeUp.leadMinutes * 60 * 1000) }))
        .filter(({ fireAt }) => fireAt.getTime() > now);
};

const scheduleWakeUpAlarm = (notifications: NotificationsApi, { shift, fireAt }: WakeUpAlarm) => {
    const role = jobRole(shift.job);
    return notifications.scheduleNotificationAsync({
        identifier: `${ALARM_ID_PREFIX}${shift.id}`,
        content: {
            title: `Time to get up — ${jobName(shift.job)} at ${formatTime(shift.startTime)}`,
            body: `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}${role ? ` · ${role}` : ''}`,
            sound: 'default',
            vibrate: ALARM_VIBRATION,
            priority: notifications.AndroidNotificationPriority.MAX,
            data: { shiftId: shift.id },
        },
        trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: ALARM_CHANNEL_ID },
    });
};

/** Upcoming shifts, from now on. */
export const getUpcomingShifts = async (): Promise<Shift[]> => {
    const { data } = await api.get<{ data: Shift[] }>('/shifts', { params: { from: new Date().toISOString() } });
    return data.data;
};

type Scheduled = { kind: 'reminder'; shift: Shift; lead: LeadMinutes; fireAt: Date } | ({ kind: 'alarm' } & WakeUpAlarm);

const syncReminders = async () => {
    const notifications = Notifications;
    if (!notifications) return;
    await cancelAllReminders();

    const settings = await getReminderSettings();
    if (!settings.enabled && !settings.wakeUp.enabled) return;
    if (!(await notifications.getPermissionsAsync()).granted) return;

    const shifts = await getUpcomingShifts();
    const now = Date.now();

    const reminders: Scheduled[] = settings.enabled
        ? shifts
            .map((shift) => {
                const lead = leadMinutesFor(shift, settings);
                if (lead === 'off') return null;
                const fireAt = new Date(Date.parse(shift.startTime) - lead * 60 * 1000);
                // Shift starts sooner than its lead time — too late to remind
                return fireAt.getTime() > now ? { kind: 'reminder' as const, shift, lead, fireAt } : null;
            })
            .filter((r): r is NonNullable<typeof r> => r !== null)
        : [];
    const alarms: Scheduled[] = planWakeUpAlarms(shifts, settings.wakeUp, now).map((alarm) => ({ kind: 'alarm', ...alarm }));

    // Soonest first, so the OS limit only ever drops notifications that are far away
    const upcoming = [...reminders, ...alarms].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()).slice(0, MAX_SCHEDULED);
    await Promise.all(
        upcoming.map((item) =>
            item.kind === 'alarm' ? scheduleWakeUpAlarm(notifications, item) : scheduleReminder(notifications, item.shift, item.lead, item.fireAt)
        )
    );
};

// Syncs never overlap: one cancel+schedule interleaving with another would
// leave duplicates or gaps. Calls made mid-sync collapse into one more run.
let runningSync: Promise<void> | null = null;
let syncAgain = false;

/** Rebuild reminders in the background. Safe to call after every shift change. */
export const requestReminderSync = () => {
    if (runningSync) {
        syncAgain = true;
        return;
    }
    runningSync = (async () => {
        do {
            syncAgain = false;
            try {
                await syncReminders();
            } catch (err) {
                console.warn('Could not update shift reminders', err);
            }
        } while (syncAgain);
        runningSync = null;
    })();
};

/** A sample reminder in 5 seconds, so the user can see what they'll get. */
export const sendTestReminder = async () => {
    if (!Notifications) throw new Error('Notifications are not available on this device');
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Shift reminders are on',
            body: "This is how you'll be reminded before each shift.",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
    });
};

/** A sample wake-up alarm in 5 seconds — loud and buzzing, like the real one. */
export const sendTestAlarm = async () => {
    if (!Notifications) throw new Error('Notifications are not available on this device');
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Time to get up',
            body: 'This is how your wake-up alarm will look before your first shift of the day.',
            sound: 'default',
            vibrate: ALARM_VIBRATION,
            priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: ALARM_CHANNEL_ID },
    });
};
