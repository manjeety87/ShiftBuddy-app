import { router } from 'expo-router';
import { Briefcase, ChevronRight, DoorOpen, Navigation, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Shift } from '../interfaces/shift.d';
import { useAuth } from '../lib/auth-context';
import { withAlpha } from '../lib/color';
import { getLeavePlan, summarizeLeavePlan } from '../lib/commute';
import { formatCountdown, formatTime } from '../lib/dateUtils';
import { startOfDay } from '../lib/daySegments';
import { jobName, jobRole } from '../lib/jobLabels';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';
import { CLOCK_IN_OPENS_MINUTES_BEFORE, clockIn, getAlreadyClockedIn } from '../lib/timesheet';
import { useNow } from '../lib/useNow';
import { formatDegrees, getShiftWeather } from '../lib/weather';
import { WeatherGlyph } from './WeatherGlyph';
import { PressableScale } from './ui/PressableScale';

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** "TODAY", "TOMORROW" or "WED, OCT 8" — the card can be for any day, so it has to say which. */
const dayLabel = (startISO: string, now: number) => {
    const start = new Date(startISO);
    const daysAway = Math.round((startOfDay(start).getTime() - startOfDay(new Date(now)).getTime()) / DAY_MS);
    if (daysAway === 0) return 'TODAY';
    if (daysAway === 1) return 'TOMORROW';
    return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
};

/**
 * The next shift, whenever it is: where, when, how long until it starts and when
 * to leave for it. Home's one loud element — everything else on the screen is quiet.
 */
export function UpcomingShiftCard({ shift }: { shift: Shift }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const now = useNow(); // keeps "Starts in 18h 20m" live
    const ink = colors.onPrimary;
    const home = user?.homeLocation ?? null;

    // When to leave home, from the user's home + usual commute (needs both locations)
    const canPlan = !!home && shift.job.latitude != null && shift.job.longitude != null;
    const leave = useFetch(
        () => (canPlan ? getLeavePlan(shift.id) : Promise.resolve(null)),
        [canPlan, shift.id, shift.startTime, home?.latitude, home?.longitude, user?.commuteMode, user?.arrivalBufferMinutes]
    );

    const label = (text: string) => (
        <Text style={{ color: withAlpha(ink, 0.6), fontSize: 12, fontWeight: '500', marginBottom: 4 }}>{text}</Text>
    );

    // Weather at the shift's start. Until it loads — and when there is none — the corner shows the plain job icon.
    const weather = useFetch(() => getShiftWeather(shift.id), [shift.id, shift.startTime, shift.job.latitude, shift.job.longitude, home?.latitude, home?.longitude]);
    const atStart = weather.data?.status === 'ok' ? weather.data.atStart : null;
    const corner = { minWidth: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(ink, 0.2) } as const;

    // The clock opens 10 minutes before the shift (the backend enforces it). Before that the
    // bar only counts down; it becomes a button when tapping it can actually work.
    const [isClockingIn, setIsClockingIn] = useState(false);
    const startsAt = Date.parse(shift.startTime);
    const clockOpensAt = startsAt - CLOCK_IN_OPENS_MINUTES_BEFORE * MINUTE_MS;
    const hasStarted = now >= startsAt;
    const canClockIn = now >= clockOpensAt;

    const handleClockIn = async () => {
        setIsClockingIn(true);
        try {
            await clockIn(shift.id);
            notify.success(`Clocked in at ${jobName(shift.job)}`);
        } catch (err: any) {
            const open = getAlreadyClockedIn(err);
            if (open) notify.error(`You’re still clocked in at ${jobName(open.job)}`, { description: 'Clock out there first.' });
            else notify.error('Couldn’t clock in', { description: err?.response?.data?.message });
        } finally {
            setIsClockingIn(false);
        }
    };

    const openShift = () => router.push(`/edit-shift/${shift.id}`);

    return (
        <View style={{ borderRadius: 24, padding: 24, marginBottom: 24, backgroundColor: colors.primary }}>
            {/* Three things to tap: the job (opens the shift), the weather (its own screen), the leave-by line (the route) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
                <PressableScale onPress={openShift} accessibilityRole="button" accessibilityHint="Opens this shift" pressedScale={0.98} style={{ flex: 1 }}>
                    <Text style={{ color: withAlpha(ink, 0.7), fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 }}>
                        {hasStarted ? 'YOUR SHIFT HAS STARTED' : `UPCOMING SHIFT · ${dayLabel(shift.startTime, now)}`}
                    </Text>
                    <Text style={{ color: ink, fontSize: 24, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>{jobName(shift.job)}</Text>
                    {!!jobRole(shift.job) && <Text style={{ color: withAlpha(ink, 0.8), fontSize: 16 }} numberOfLines={1}>{jobRole(shift.job)}</Text>}
                </PressableScale>
                {atStart ? (
                    <PressableScale
                        onPress={() => router.push(`/weather/${shift.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${formatDegrees(atStart.temperature)}, ${atStart.conditionLabel}. Opens the weather for this shift`}
                        hitSlop={8}
                        style={{ ...corner, flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
                    >
                        <WeatherGlyph hour={atStart} color={ink} size={20} />
                        <Text style={{ color: ink, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatDegrees(atStart.temperature)}</Text>
                    </PressableScale>
                ) : (
                    <View style={{ ...corner, width: 48 }}>
                        <Briefcase color={ink} size={22} />
                    </View>
                )}
            </View>

            <PressableScale onPress={openShift} accessibilityRole="button" accessibilityHint="Opens this shift" pressedScale={0.98}>
                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                        {label('STARTS')}
                        <Text style={{ color: ink, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatTime(shift.startTime)}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: withAlpha(ink, 0.2) }} />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        {label('ENDS')}
                        <Text style={{ color: ink, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{formatTime(shift.endTime)}</Text>
                    </View>
                </View>
            </PressableScale>

            {/* Leave-by line: answers "when do I have to go?" without opening the route screen */}
            <PressableScale
                onPress={() => router.push(canPlan ? `/transit/${shift.id}` : home ? `/edit-job/${shift.jobId}` : '/home-address')}
                accessibilityRole="button"
                accessibilityHint="Opens route planning"
                pressedScale={0.98}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(ink, 0.2) }}
            >
                {canPlan ? <DoorOpen color={ink} size={18} /> : <Navigation color={ink} size={18} />}
                <View style={{ flex: 1 }}>
                    {!canPlan ? (
                        <Text style={{ color: ink, fontSize: 14, fontWeight: '600' }}>
                            {home ? 'Pin this job on the map to see when to leave' : 'Add your home address to see when to leave'}
                        </Text>
                    ) : leave.isLoading && !leave.data ? (
                        <ActivityIndicator color={ink} size="small" style={{ alignSelf: 'flex-start' }} />
                    ) : leave.data ? (
                        <>
                            <Text style={{ color: ink, fontSize: 15, fontWeight: '700' }}>Leave home by {formatTime(leave.data.leaveAt)}</Text>
                            <Text style={{ color: withAlpha(ink, 0.75), fontSize: 12 }} numberOfLines={1}>{summarizeLeavePlan(leave.data)}</Text>
                        </>
                    ) : (
                        <Text style={{ color: ink, fontSize: 14, fontWeight: '600' }}>Plan your route</Text>
                    )}
                </View>
                <ChevronRight color={withAlpha(ink, 0.7)} size={18} />
            </PressableScale>

            {canClockIn ? (
                // The card's one solid button: starting the clock is what the user is here to do when the shift comes
                <PressableScale
                    onPress={handleClockIn}
                    disabled={isClockingIn}
                    accessibilityRole="button"
                    accessibilityLabel={`Clock in at ${jobName(shift.job)}`}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, paddingVertical: 12, borderRadius: 16, backgroundColor: ink }}
                >
                    {isClockingIn ? <ActivityIndicator color={colors.primary} size="small" /> : <Timer color={colors.primary} size={18} />}
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Clock In</Text>
                    <Text style={{ color: withAlpha(colors.primary, 0.75), fontWeight: '600', fontSize: 14 }}>
                        · {hasStarted ? `started ${formatTime(shift.startTime)}` : `starts in ${formatCountdown(shift.startTime)}`}
                    </Text>
                </PressableScale>
            ) : (
                <View accessible style={{ alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 16, backgroundColor: withAlpha(ink, 0.12) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Timer color={ink} size={18} />
                        <Text style={{ color: ink, fontWeight: '700', fontSize: 16 }}>Starts in {formatCountdown(shift.startTime)}</Text>
                    </View>
                    <Text style={{ color: withAlpha(ink, 0.75), fontSize: 12 }}>Clock in opens at {formatTime(new Date(clockOpensAt).toISOString())}</Text>
                </View>
            )}
        </View>
    );
}
