import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { formatTime } from '../lib/dateUtils';
import { jobName, jobRole } from '../lib/jobLabels';
import { notify } from '../lib/notify';
import { formatDuration } from '../lib/shiftTime';
import { useTheme } from '../lib/theme-context';
import { clockOut, type TimeEntry } from '../lib/timesheet';
import { useNow } from '../lib/useNow';
import { Button, TextButton } from './ui/Button';
import { ThemedText } from './ui/ThemedText';

const MINUTE_MS = 60 * 1000;

/** Home while working: where you're clocked in, for how long, and the way out. */
export function ClockedInCard({ entry }: { entry: TimeEntry }) {
    const { colors } = useTheme();
    const now = useNow(); // keeps "2h 14m so far" moving
    const [isClockingOut, setIsClockingOut] = useState(false);
    const openTimesheet = () => router.push(`/timesheet?jobId=${entry.jobId}`);
    const minutesSoFar = Math.max(0, Math.round((now - Date.parse(entry.clockIn)) / MINUTE_MS));

    const handleClockOut = async () => {
        setIsClockingOut(true);
        try {
            const finished = await clockOut();
            const clocked = Math.round((Date.parse(finished.clockOut!) - Date.parse(finished.clockIn)) / MINUTE_MS);
            notify.success(`Clocked out · ${formatDuration(clocked - finished.breakMinutes)} paid`, {
                description: finished.breakMinutes ? `${finished.breakMinutes} min unpaid break taken off — change it in your timesheet if that’s wrong.` : undefined,
                action: { label: 'Timesheet', onPress: openTimesheet },
            });
        } catch (err: any) {
            notify.error('Couldn’t clock out', { description: err?.response?.data?.message });
            setIsClockingOut(false);
        }
    };

    return (
        <View style={{ borderRadius: 24, padding: 24, marginBottom: 24, backgroundColor: colors.surface, gap: spacing.md }}>
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
                    <ThemedText size="xs" weight="semibold" color={colors.success}>ON THE CLOCK</ThemedText>
                </View>
                <ThemedText size="2xl" weight="bold" numberOfLines={1}>{jobName(entry.job)}</ThemedText>
                {!!jobRole(entry.job) && <ThemedText variant="secondary" numberOfLines={1}>{jobRole(entry.job)}</ThemedText>}
            </View>

            <View style={{ flexDirection: 'row', padding: spacing.md, borderRadius: radius.md, backgroundColor: withAlpha(colors.success, 0.1) }}>
                <View style={{ flex: 1 }}>
                    <ThemedText variant="muted" size="xs">CLOCKED IN</ThemedText>
                    <ThemedText size="lg" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{formatTime(entry.clockIn)}</ThemedText>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <ThemedText variant="muted" size="xs">SO FAR</ThemedText>
                    <ThemedText size="lg" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{formatDuration(minutesSoFar)}</ThemedText>
                </View>
            </View>

            <Button label="Clock Out" onPress={handleClockOut} isLoading={isClockingOut} />
            <TextButton label="See your timesheet" size="sm" onPress={openTimesheet} style={{ alignSelf: 'center' }} />
        </View>
    );
}
