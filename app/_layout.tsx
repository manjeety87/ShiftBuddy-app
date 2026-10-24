import type { NotificationResponse } from 'expo-notifications'; // type only — never loads the module
import { router, Stack } from "expo-router";
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppToaster } from '../components/ui/AppToaster';
import { DialogHost } from '../components/ui/DialogHost';
import '../global.css';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { Notifications } from '../lib/notifications';
import { cancelAllReminders, configureNotifications, requestReminderSync } from '../lib/reminders';
import { ThemeProvider, useTheme } from '../lib/theme-context';
import { useProtectedRoute } from '../lib/useProtectedRoute';

configureNotifications();

// Every screen that opens over the tabs as a sheet.
const SHEET_ROUTES = [
  'create-job',
  'create-shift',
  'import-schedule',
  'review-shifts',
  'edit-job/[id]',
  'edit-shift/[id]',
  'missed-shift/[id]',
  'edit-profile',
  'change-password',
  'delete-account',
  'security',
  'your-data',
  'customize',
  'tax-settings',
  'pay-summary',
  'theme-settings',
  'custom-theme',
  'home-address',
  'reminder-settings',
  'copy-shifts',
  'conflict',
  'sharing',
  'verify-email',
  'shared/[ownerId]',
  'transit/[shiftId]',
  'weather/[shiftId]',
  'timesheet',
  'edit-time-entry/[id]',
  'welcome',
] as const;

// iOS gets its native card sheet (slides up, swipe/slides down to dismiss).
// On Android "modal" is really a push: the screen underneath is detached once the
// sheet is up and re-attached when it closes, which shows as a glitch on Cancel.
// transparentModal keeps that screen mounted, so the sheet slides down cleanly
// along the same path it came in (each sheet paints its own background).
const SHEET_OPTIONS = {
  presentation: Platform.OS === 'android' ? 'transparentModal' : 'modal',
  headerShown: false,
  animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default',
} as const;

/** Keeps shift reminders in step with the signed-in user, and opens a shift when its reminder is tapped. */
function useShiftReminders() {
  const { user, isLoading } = useAuth();
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      cancelAllReminders().catch(() => {});
      return;
    }
    requestReminderSync();
    // Shifts may have changed on another device, and stale reminders are worse than none.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestReminderSync();
    });
    return () => subscription.remove();
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || !Notifications) return;
    const openShift = (response: NotificationResponse | null) => {
      const request = response?.notification.request;
      const shiftId = request?.content.data?.shiftId;
      if (!request || typeof shiftId !== 'string' || handledResponseId.current === request.identifier) return;
      handledResponseId.current = request.identifier;
      router.push(`/edit-shift/${shiftId}`);
    };
    // Tapped while the app was closed…
    Notifications.getLastNotificationResponseAsync().then(openShift).catch(() => {});
    // …or while it's running.
    const subscription = Notifications.addNotificationResponseReceivedListener(openShift);
    return () => subscription.remove();
  }, [user]);
}

function RootLayoutNav() {
  useProtectedRoute();
  useShiftReminders();
  const { colors } = useTheme();

  return (
    <>
    {/* Light or dark status bar text, depending on the theme's background */}
    <StatusBar style={colors.isDark ? 'light' : 'dark'} />
    <Stack
      // Paint every screen with the theme background, so no white flash
      // shows behind screens while they slide in or modals open.
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      initialRouteName="index"
    >
      {SHEET_ROUTES.map((name) => (
        <Stack.Screen key={name} name={name} options={SHEET_OPTIONS} />
      ))}
    </Stack>
    {/* App-wide outlets: toasts for outcomes, themed dialogs for questions */}
    <AppToaster />
    <DialogHost />
    </>
  );
}

// Render errors show expo-router's recovery screen (with Retry) instead of a blank app
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    // Toasts are swipeable, so gestures need a root view
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}