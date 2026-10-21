import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

// expo-notifications throws as soon as it's imported in Expo Go on Android
// (SDK 53+), and has no web implementation — so it's only loaded where it works.
// Everywhere else reminders are simply unavailable instead of crashing the app.
const isAndroidExpoGo =
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const notificationsSupported = Platform.OS !== 'web' && !isAndroidExpoGo;

/** Why reminders can't run here, for the settings screen. null when they can. */
export const notificationsUnavailableReason = isAndroidExpoGo
    ? 'Reminders need the installed ShiftBuddy app on Android — Expo Go no longer supports notifications there.'
    : Platform.OS === 'web'
        ? 'Reminders are only available in the mobile app.'
        : null;

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const Notifications: NotificationsModule | null = notificationsSupported ? require('expo-notifications') : null;
