import { router } from 'expo-router';
import { AlarmClock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Switch, View } from 'react-native';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { useMyJobs } from '../lib/useMyJobs';
import {
    ensureNotificationPermission,
    formatLeadTime,
    getReminderSettings,
    getUpcomingShifts,
    LEAD_TIME_OPTIONS,
    planWakeUpAlarms,
    saveReminderSettings,
    sendTestAlarm,
    sendTestReminder,
    WAKE_UP_OPTIONS,
    type LeadMinutes,
    type ReminderSettings,
} from '../lib/reminders';
import { notificationsUnavailableReason } from '../lib/notifications';
import { useTheme } from '../lib/theme-context';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { notify } from '../lib/notify';
import { jobName, jobRole } from '../lib/jobLabels';
import { formatDate, formatTime } from '../lib/dateUtils';
import { useFetch } from '../lib/useFetch';
import { useShiftsChanged } from '../lib/shiftEvents';
import { Button } from '../components/ui/Button';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

type JobChoice = LeadMinutes | 'off' | 'default';

const shortLead = (minutes: number) => (minutes < 60 ? `${minutes}m` : `${minutes / 60}h`);
// 90 → "1h 30m"
const wakeLeadLabel = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;

export default function ReminderSettingsScreen() {
    const { colors } = useTheme();
    const { data: jobs } = useMyJobs();
    const [settings, setSettings] = useState<ReminderSettings | null>(null);
    const upcoming = useFetch(getUpcomingShifts);
    useShiftsChanged(upcoming.refetch);

    useEffect(() => {
        getReminderSettings().then(setSettings);
    }, []);

    // Settings-style screen: every change applies (and reschedules) immediately.
    const update = (next: ReminderSettings) => {
        setSettings(next);
        saveReminderSettings(next).catch(() => showAlert('Error', 'Could not save your reminder settings.'));
    };

    // Turning either one on needs notification permission first
    const canNotify = async () => {
        if ((await ensureNotificationPermission()) === 'granted') return true;
        showAlert(
            'Notifications are off',
            'Allow notifications for this app in Settings to get shift reminders and wake-up alarms.',
            [
                { text: 'Not Now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
        );
        return false;
    };

    const handleToggle = async (enabled: boolean) => {
        if (!settings || (enabled && !(await canNotify()))) return;
        update({ ...settings, enabled });
    };

    const handleWakeUpToggle = async (enabled: boolean) => {
        if (!settings || (enabled && !(await canNotify()))) return;
        update({ ...settings, wakeUp: { ...settings.wakeUp, enabled } });
    };

    const handleTestAlarm = async () => {
        try {
            await sendTestAlarm();
            notify.success('Test alarm set', { description: 'It goes off in about 5 seconds — try locking your phone.' });
        } catch {
            notify.error('Couldn’t set a test alarm');
        }
    };

    const setJobChoice = (jobId: string, choice: JobChoice) => {
        if (!settings) return;
        const jobLeadMinutes = { ...settings.jobLeadMinutes };
        if (choice === 'default') delete jobLeadMinutes[jobId];
        else jobLeadMinutes[jobId] = choice;
        update({ ...settings, jobLeadMinutes });
    };

    const handleTest = async () => {
        try {
            await sendTestReminder();
            notify.success('Test reminder sent', { description: 'It arrives in about 5 seconds — try locking your phone.' });
        } catch {
            notify.error('Couldn’t send a test reminder');
        }
    };

    if (!settings) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const nextAlarm = planWakeUpAlarms(upcoming.data ?? [], settings.wakeUp)[0];

    const chip = (label: string, isOn: boolean, onPress: () => void) => (
        <PressableScale
            key={label}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm, backgroundColor: isOn ? colors.primary : colors.surfaceLight }}
        >
            <ThemedText size="sm" weight="medium" color={isOn ? colors.onPrimary : colors.textPrimary}>{label}</ThemedText>
        </PressableScale>
    );

    return (
        <KeyboardSafeView>
            <SheetHeader title="Reminders & Alarms" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="muted" size="sm" style={{ marginBottom: spacing.lg, lineHeight: 20 }}>
                    Get a notification before each shift starts. Reminders update by themselves when you add, edit or copy shifts.
                </ThemedText>

                {notificationsUnavailableReason && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md }}>
                        <ThemedText variant="secondary" size="sm" style={{ lineHeight: 20 }}>{notificationsUnavailableReason}</ThemedText>
                    </View>
                )}

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', opacity: notificationsUnavailableReason ? 0.5 : 1 }}>
                    <ThemedText weight="medium" style={{ flex: 1 }}>Remind me before shifts</ThemedText>
                    <Switch value={settings.enabled} onValueChange={handleToggle} disabled={!!notificationsUnavailableReason} trackColor={{ true: colors.primary }} />
                </View>

                {settings.enabled && (
                    <>
                        <ThemedText variant="secondary" size="sm" style={{ marginBottom: 8 }}>How early</ThemedText>
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, flexDirection: 'row', gap: 6, marginBottom: spacing.lg }}>
                            {LEAD_TIME_OPTIONS.map((minutes) =>
                                chip(formatLeadTime(minutes), settings.defaultLeadMinutes === minutes, () =>
                                    update({ ...settings, defaultLeadMinutes: minutes })
                                )
                            )}
                        </View>

                        {!!jobs?.length && (
                            <>
                                <ThemedText variant="secondary" size="sm" style={{ marginBottom: 8 }}>Per job</ThemedText>
                                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' }}>
                                    {jobs.map((job, i) => {
                                        const choice: JobChoice = job.id in settings.jobLeadMinutes ? settings.jobLeadMinutes[job.id] : 'default';
                                        return (
                                            <View key={job.id} style={{ padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: job.color }} />
                                                    <ThemedText weight="medium" style={{ flex: 1 }} numberOfLines={1}>{jobName(job)}</ThemedText>
                                                    {!!jobRole(job) && <ThemedText variant="muted" size="xs" numberOfLines={1}>{jobRole(job)}</ThemedText>}
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                    {chip('Default', choice === 'default', () => setJobChoice(job.id, 'default'))}
                                                    {LEAD_TIME_OPTIONS.map((minutes) =>
                                                        chip(shortLead(minutes), choice === minutes, () => setJobChoice(job.id, minutes))
                                                    )}
                                                    {chip('Off', choice === 'off', () => setJobChoice(job.id, 'off'))}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        <Button label="Send a Test Reminder" variant="secondary" onPress={handleTest} style={{ marginBottom: spacing.md }} />
                    </>
                )}

                <ThemedText weight="semibold" style={{ marginTop: spacing.md, marginBottom: 4 }}>Wake-up alarm</ThemedText>
                <ThemedText variant="muted" size="sm" style={{ marginBottom: spacing.md, lineHeight: 20 }}>
                    A loud alarm before your first shift of each day. Change a shift and the alarm moves with it.
                </ThemedText>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', opacity: notificationsUnavailableReason ? 0.5 : 1 }}>
                    <ThemedText weight="medium" style={{ flex: 1 }}>Wake me up before shifts</ThemedText>
                    <Switch value={settings.wakeUp.enabled} onValueChange={handleWakeUpToggle} disabled={!!notificationsUnavailableReason} trackColor={{ true: colors.primary }} />
                </View>

                {settings.wakeUp.enabled && (
                    <>
                        <ThemedText variant="secondary" size="sm" style={{ marginBottom: 8 }}>Before the first shift (time to get ready + travel)</ThemedText>
                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, flexDirection: 'row', gap: 6, marginBottom: spacing.md }}>
                            {WAKE_UP_OPTIONS.map((minutes) =>
                                chip(wakeLeadLabel(minutes), settings.wakeUp.leadMinutes === minutes, () =>
                                    update({ ...settings, wakeUp: { ...settings.wakeUp, leadMinutes: minutes } })
                                )
                            )}
                        </View>

                        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <AlarmClock color={colors.primary} size={20} />
                            <ThemedText size="sm" style={{ flex: 1, lineHeight: 20 }}>
                                {nextAlarm
                                    ? `Next alarm: ${formatDate(nextAlarm.fireAt.toISOString())} at ${formatTime(nextAlarm.fireAt.toISOString())} — for ${jobName(nextAlarm.shift.job)} at ${formatTime(nextAlarm.shift.startTime)}`
                                    : upcoming.isLoading
                                        ? 'Checking your upcoming shifts…'
                                        : 'No upcoming shifts — an alarm is set as soon as you add one.'}
                            </ThemedText>
                        </View>

                        <Button label="Try the Alarm" variant="secondary" onPress={handleTestAlarm} style={{ marginBottom: spacing.md }} />
                    </>
                )}
            </ScrollView>
        </KeyboardSafeView>
    );
}
