import { router } from 'expo-router';
import { Briefcase, ChevronRight, DoorOpen, Navigation, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { Shift } from '../interfaces/shift.d';
import { useAuth } from '../lib/auth-context';
import { withAlpha } from '../lib/color';
import { getLeavePlan, summarizeLeavePlan, type StartChoice } from '../lib/commute';
import { formatCountdown, formatTime } from '../lib/dateUtils';
import { featuresOf } from '../lib/features';
import { motion } from '../lib/motion';
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
export function UpcomingShiftCard({ shift, isClockedIn = false }: { shift: Shift; isClockedIn?: boolean }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const now = useNow(); // keeps "Starts in 18h 20m" live
    const ink = colors.onPrimary;
    const home = user?.homeLocation ?? null;
    const features = featuresOf(user);

    const label = (text: string) => (
        <Text style={{ color: withAlpha(ink, 0.6), fontSize: 12, fontWeight: '500', marginBottom: 4 }}>{text}</Text>
    );

    // Weather at the shift's start. Until it loads — and when there is none — the corner shows the plain job icon.
    const weather = useFetch(
        () => (features.weather ? getShiftWeather(shift.id) : Promise.resolve(null)),
        [features.weather, shift.id, shift.startTime, shift.job.latitude, shift.job.longitude, home?.latitude, home?.longitude]
    );
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

            {/* Before the shift: when to leave, and from where. Once it has started (or the clock runs) there's nowhere to go */}
            {hasStarted || isClockedIn ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(ink, 0.2) }}>
                    <Timer color={ink} size={18} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: ink, fontSize: 15, fontWeight: '700' }}>Ends at {formatTime(shift.endTime)}</Text>
                        <Text style={{ color: withAlpha(ink, 0.75), fontSize: 12 }}>{Date.parse(shift.endTime) > now ? `${formatCountdown(shift.endTime)} left` : 'Finished'}</Text>
                    </View>
                </View>
            ) : features.leaveBy ? (
                // Keyed by shift: "From home?" is a what-if for this one shift, never carried to the next
                <LeaveLine key={shift.id} shift={shift} />
            ) : null}

            {features.timesheet && canClockIn ? (
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
            ) : !hasStarted ? (
                <View accessible style={{ alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 16, backgroundColor: withAlpha(ink, 0.12) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Timer color={ink} size={18} />
                        <Text style={{ color: ink, fontWeight: '700', fontSize: 16 }}>Starts in {formatCountdown(shift.startTime)}</Text>
                    </View>
                    {features.timesheet && <Text style={{ color: withAlpha(ink, 0.75), fontSize: 12 }}>Clock in opens at {formatTime(new Date(clockOpensAt).toISOString())}</Text>}
                </View>
            ) : null}

            {/* Sick, called off…: marked here so the card moves on to the next shift */}
            <PressableScale
                onPress={() => router.push(`/missed-shift/${shift.id}`)}
                accessibilityRole="button"
                hitSlop={10}
                pressedScale={1}
                pressedStyle={{ opacity: 0.6 }}
                style={{ alignSelf: 'center', paddingTop: 14 }}
            >
                <Text style={{ color: withAlpha(ink, 0.85), fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                    {hasStarted ? 'Didn’t make it?' : 'Can’t make it?'}
                </Text>
            </PressableScale>
        </View>
    );
}

/**
 * When to leave for the shift, and from where. The backend starts from the shift
 * just before when there is one (you're already out), otherwise from home.
 * "From home?" asks the what-if for this shift only; the words fade in on a swap.
 */
function LeaveLine({ shift }: { shift: Shift }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const ink = colors.onPrimary;
    const home = user?.homeLocation ?? null;
    const [from, setFrom] = useState<StartChoice>('auto');
    // The shift before's name, kept for the "back" link while looking at home
    const [backTo, setBackTo] = useState<string | null>(null);

    const hasJobPin = shift.job.latitude != null && shift.job.longitude != null;
    const leave = useFetch(
        () => (hasJobPin ? getLeavePlan(shift.id, from).catch(() => null) : Promise.resolve(null)),
        [hasJobPin, from, shift.id, shift.startTime, home?.latitude, home?.longitude, user?.commuteMode, user?.arrivalBufferMinutes]
    );
    const plan = leave.data;

    const headline = !plan
        ? null
        : plan.sameBuilding
          ? `Same building — head over by ${formatTime(plan.arriveBy)}`
          : plan.leavesAsShiftEnds
            ? `Leave ${plan.from.name} as it ends, ${formatTime(plan.leaveAt)}`
            : plan.from.kind === 'previousShift'
              ? `Leave ${plan.from.name} by ${formatTime(plan.leaveAt)}`
              : `Leave home by ${formatTime(plan.leaveAt)}`;
    const detail = !plan
        ? null
        : plan.sameBuilding
          ? `After your ${plan.from.name} shift`
          : plan.lateMinutes > 0
            ? `${summarizeLeavePlan(plan)} · about ${plan.lateMinutes} min late`
            : summarizeLeavePlan(plan);
    const other = plan?.alternatives.includes('home') ? 'home' : plan?.alternatives.includes('previousShift') ? 'previousShift' : null;

    return (
        <View style={{ marginBottom: 12 }}>
            <PressableScale
                onPress={() => router.push(plan ? `/transit/${shift.id}?from=${from}` : !hasJobPin ? `/edit-job/${shift.jobId}` : home ? `/transit/${shift.id}` : '/home-address')}
                accessibilityRole="button"
                accessibilityHint="Opens route planning"
                pressedScale={0.98}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: withAlpha(ink, 0.2) }}
            >
                {plan ? <DoorOpen color={ink} size={18} /> : <Navigation color={ink} size={18} />}
                <View style={{ flex: 1 }}>
                    {leave.isLoading && !plan ? (
                        <ActivityIndicator color={ink} size="small" style={{ alignSelf: 'flex-start' }} />
                    ) : plan ? (
                        <Animated.View key={`${plan.from.kind}-${plan.leaveAt}`} entering={motion.swap}>
                            <Text style={{ color: ink, fontSize: 15, fontWeight: '700' }}>{headline}</Text>
                            <Text style={{ color: withAlpha(ink, plan.lateMinutes > 0 ? 1 : 0.75), fontSize: 12, fontWeight: plan.lateMinutes > 0 ? '600' : '400' }} numberOfLines={1}>{detail}</Text>
                        </Animated.View>
                    ) : (
                        <Text style={{ color: ink, fontSize: 14, fontWeight: '600' }}>
                            {!hasJobPin ? 'Pin this job on the map to see when to leave' : !home ? 'Add your home address to see when to leave' : 'Plan your route'}
                        </Text>
                    )}
                </View>
                <ChevronRight color={withAlpha(ink, 0.7)} size={18} />
            </PressableScale>
            {other && (
                <PressableScale
                    onPress={() => {
                        if (other === 'home' && plan) setBackTo(plan.from.name);
                        setFrom(other);
                    }}
                    accessibilityRole="button"
                    hitSlop={10}
                    style={{ alignSelf: 'flex-end', paddingHorizontal: 6, paddingTop: 8 }}
                >
                    <Text style={{ color: ink, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                        {other === 'home' ? 'From home?' : `From ${backTo ?? 'your shift before'}`}
                    </Text>
                </PressableScale>
            )}
        </View>
    );
}
