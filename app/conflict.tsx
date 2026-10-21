import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowDown, Bus, Car, CheckCircle2, Clock3, DoorOpen, Layers, MapPin } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { TransitItineraryCard } from '../components/TransitItineraryCard';
import { PressableScale } from '../components/ui/PressableScale';
import { LoadError } from '../components/ui/LoadError';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { Shift } from '../interfaces/shift.d';
import { withAlpha } from '../lib/color';
import { formatDate, formatTime } from '../lib/dateUtils';
import { formatDuration } from '../lib/shiftTime';
import { getShiftById } from '../lib/shifts';
import { useTheme } from '../lib/theme-context';
import { getTransitPlan, type TransitItinerary } from '../lib/transit';
import { getTravelConflicts, type TravelConflict } from '../lib/travelConflicts';
import { useFetch } from '../lib/useFetch';
import { jobName, jobRole } from '../lib/jobLabels';

type Kind = 'overlap' | 'travel';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const minutesBetween = (a: string | Date, b: string | Date) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / MINUTE_MS);

/** Round up to the next 5 minutes — "start at 2:10 PM", not "2:08 PM". */
const roundUpTo5 = (iso: string) => {
    const date = new Date(iso);
    date.setSeconds(0, 0);
    date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5);
    return date.toISOString();
};

interface IssueData {
    first: Shift;
    second: Shift;
    /** Travel issues only; null once the trip fits (e.g. after an edit) */
    travel: TravelConflict | null;
    /** The actual trip leaving as the first shift ends (transit only) */
    trip: TransitItinerary | null;
}

const loadIssue = async (kind: Kind, fromId: string, toId: string): Promise<IssueData> => {
    const [first, second] = await Promise.all([getShiftById(fromId), getShiftById(toId)]);
    if (kind === 'overlap') return { first, second, travel: null, trip: null };

    // Ask for just the window around this pair — works for any date, not only the next 14 days
    const conflicts = await getTravelConflicts({
        from: new Date(Date.parse(first.startTime) - DAY_MS).toISOString(),
        to: new Date(Date.parse(second.startTime) + DAY_MS).toISOString(),
    });
    const travel = conflicts.find((c) => c.fromShift.id === fromId && c.toShift.id === toId) ?? null;

    let trip: TransitItinerary | null = null;
    if (travel?.mode === 'TRANSIT' && first.job.latitude != null && first.job.longitude != null && second.job.latitude != null && second.job.longitude != null) {
        const options = await getTransitPlan(
            { lat: first.job.latitude, lng: first.job.longitude },
            { lat: second.job.latitude, lng: second.job.longitude },
            new Date(first.endTime),
            'depart'
        ).catch(() => []);
        trip = options[0] ?? null;
    }
    return { first, second, travel, trip };
};

// ─── pieces ─────────────────────────────────────────────────────────────────

function ShiftBlock({ shift, emphasis }: { shift: Shift; emphasis: 'start' | 'end' | 'both' }) {
    const { colors } = useTheme();
    const time =
        emphasis === 'end' ? `Ends ${formatTime(shift.endTime)}`
            : emphasis === 'start' ? `Starts ${formatTime(shift.startTime)}`
                : `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
    return (
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
            <View style={{ width: 4, backgroundColor: shift.job.color }} />
            <View style={{ flex: 1, padding: spacing.md, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                        <ThemedText weight="semibold">{jobName(shift.job)}</ThemedText>
                        {!!jobRole(shift.job) && <ThemedText variant="secondary" size="sm">{jobRole(shift.job)}</ThemedText>}
                    </View>
                    <PressableScale
                        onPress={() => router.push(`/edit-shift/${shift.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${jobName(shift.job)} shift`}
                        hitSlop={8}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: withAlpha(colors.primary, 0.12) }}
                    >
                        <ThemedText size="sm" weight="semibold" color={colors.primary}>Edit</ThemedText>
                    </PressableScale>
                </View>
                <ThemedText weight="medium" style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}>{time}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin color={colors.textMuted} size={13} />
                    {shift.job.location ? (
                        <ThemedText variant="muted" size="xs" numberOfLines={1} style={{ flex: 1 }}>{shift.job.location}</ThemedText>
                    ) : (
                        <PressableScale onPress={() => router.push(`/edit-job/${shift.jobId}`)} pressedScale={1} pressedStyle={{ opacity: 0.6 }}>
                            <ThemedText size="xs" color={colors.primary} weight="medium">Add the job’s location</ThemedText>
                        </PressableScale>
                    )}
                </View>
            </View>
        </View>
    );
}

/** Both shifts on one time axis, with the overlapping stretch highlighted. */
function OverlapBars({ first, second }: { first: Shift; second: Shift }) {
    const { colors } = useTheme();
    const axisStart = Math.min(Date.parse(first.startTime), Date.parse(second.startTime));
    const axisEnd = Math.max(Date.parse(first.endTime), Date.parse(second.endTime));
    const span = axisEnd - axisStart;
    const pct = (iso: string) => `${((Date.parse(iso) - axisStart) / span) * 100}%` as const;
    const overlapStart = Date.parse(first.startTime) > Date.parse(second.startTime) ? first.startTime : second.startTime;
    const overlapEnd = Date.parse(first.endTime) < Date.parse(second.endTime) ? first.endTime : second.endTime;

    const bar = (shift: Shift) => (
        <View style={{ height: 22, justifyContent: 'center' }}>
            <View style={{ position: 'absolute', left: pct(shift.startTime), right: `${100 - parseFloat(pct(shift.endTime))}%`, height: 10, borderRadius: 5, backgroundColor: shift.job.color }} />
        </View>
    );

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
            <View>
                <View
                    style={{
                        position: 'absolute', top: -4, bottom: -4, left: pct(overlapStart),
                        right: `${100 - parseFloat(pct(overlapEnd))}%`,
                        borderRadius: 6, backgroundColor: withAlpha(colors.danger, 0.18),
                        borderWidth: 1, borderColor: withAlpha(colors.danger, 0.5), borderStyle: 'dashed',
                    }}
                />
                {bar(first)}
                {bar(second)}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <ThemedText variant="muted" size="xs">{formatTime(new Date(axisStart).toISOString())}</ThemedText>
                <ThemedText variant="muted" size="xs">{formatTime(new Date(axisEnd).toISOString())}</ThemedText>
            </View>
            <ThemedText size="sm" weight="medium" color={colors.danger} style={{ marginTop: spacing.sm }}>
                Both shifts run {formatTime(overlapStart)} – {formatTime(overlapEnd)} ({formatDuration(minutesBetween(overlapStart, overlapEnd))})
            </ThemedText>
        </View>
    );
}

function FixRow({ icon: Icon, title, detail, action, onPress }: { icon: typeof Clock3; title: string; detail: string; action: string; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            pressedScale={0.98}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg }}
        >
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.12) }}>
                <Icon color={colors.primary} size={18} />
            </View>
            <View style={{ flex: 1 }}>
                <ThemedText weight="semibold">{title}</ThemedText>
                <ThemedText variant="secondary" size="sm">{detail}</ThemedText>
            </View>
            <ThemedText size="sm" weight="semibold" color={colors.primary}>{action}</ThemedText>
        </PressableScale>
    );
}

function SectionLabel({ children }: { children: string }) {
    return (
        <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginTop: spacing.lg, marginBottom: 8, marginLeft: 4 }}>
            {children}
        </ThemedText>
    );
}

// ─── screen ─────────────────────────────────────────────────────────────────

/** What's wrong between two shifts, why, and the ways to fix it. `/conflict?kind=overlap|travel&from=&to=` */
export default function ConflictScreen() {
    const { colors } = useTheme();
    const { kind, from, to } = useLocalSearchParams<{ kind: Kind; from: string; to: string }>();
    const { data, isLoading, error, refetch } = useFetch(() => loadIssue(kind, from, to), [kind, from, to]);
    const [isTripOpen, setIsTripOpen] = useState(false);

    // Coming back from editing a shift → re-check, so the screen shows whether it's fixed
    useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

    const close = () => router.back();

    const body = () => {
        if (isLoading && !data) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
        if (error && !data) return <LoadError message={error} onRetry={refetch} />;
        if (!data) return null;
        const { first, second, travel, trip } = data;

        // Works whichever shift starts first (an edit can swap them)
        const latestStart = Math.max(Date.parse(first.startTime), Date.parse(second.startTime));
        const earliestEnd = Math.min(Date.parse(first.endTime), Date.parse(second.endTime));
        const overlapMinutes = Math.round((earliestEnd - latestStart) / MINUTE_MS);
        const stillOverlapping = kind === 'overlap' && overlapMinutes > 0;
        const resolved = kind === 'overlap' ? !stillOverlapping : !travel;

        if (resolved) {
            return (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
                    <CheckCircle2 color={colors.success} size={44} />
                    <ThemedText size="lg" weight="bold">All clear</ThemedText>
                    <ThemedText variant="secondary" style={{ textAlign: 'center' }}>
                        {kind === 'overlap'
                            ? `${jobName(first.job)} and ${jobName(second.job)} no longer overlap.`
                            : `You have enough time to get from ${jobName(first.job)} to ${jobName(second.job)}.`}
                    </ThemedText>
                </View>
            );
        }

        if (kind === 'overlap') {
            return (
                <>
                    <Hero icon={Layers} tone={colors.danger} title={`Shifts overlap by ${formatDuration(overlapMinutes)}`} subtitle={formatDate(first.startTime)} />
                    <OverlapBars first={first} second={second} />
                    <SectionLabel>THE SHIFTS</SectionLabel>
                    <View style={{ gap: spacing.sm }}>
                        <ShiftBlock shift={first} emphasis="both" />
                        <ShiftBlock shift={second} emphasis="both" />
                    </View>
                    <ThemedText variant="muted" size="sm" style={{ marginTop: spacing.md, marginLeft: 4 }}>
                        Change one of the times with Edit, or leave them if you meant to book both.
                    </ThemedText>
                </>
            );
        }

        const t = travel!;
        const ModeIcon = t.mode === 'DRIVING' ? Car : Bus;
        const modeWord = t.mode === 'DRIVING' ? 'driving' : 'transit';
        const late = t.severity === 'late';
        const startAt = roundUpTo5(t.earliestStart);
        return (
            <>
                <Hero
                    icon={Clock3}
                    tone={late ? colors.danger : colors.warning}
                    title={late ? `~${t.lateByMinutes} min late to ${jobName(second.job)}` : `Tight trip to ${jobName(second.job)}`}
                    subtitle={`${formatDate(second.startTime)} · ${t.gapMinutes} min between shifts, ${t.travelMinutes} min to get there`}
                />

                <SectionLabel>THE TRIP</SectionLabel>
                <ShiftBlock shift={first} emphasis="end" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingLeft: spacing.md }}>
                    <ArrowDown color={colors.textMuted} size={16} />
                    <ModeIcon color={colors.textSecondary} size={16} />
                    <ThemedText variant="secondary" size="sm" style={{ flex: 1 }}>
                        {t.travelMinutes} min by {modeWord} · leave {formatTime(first.endTime)} → arrive {formatTime(t.earliestStart)}
                    </ThemedText>
                </View>
                <ShiftBlock shift={second} emphasis="start" />

                <SectionLabel>WAYS TO FIX IT</SectionLabel>
                <View style={{ gap: spacing.sm }}>
                    {t.leaveBy ? (
                        <FixRow
                            icon={DoorOpen}
                            title={`Leave ${jobName(first.job)} by ${formatTime(t.leaveBy)}`}
                            detail={`${formatDuration(minutesBetween(t.leaveBy, first.endTime))} before it ends — then you’re on time`}
                            action="Edit"
                            onPress={() => router.push(`/edit-shift/${first.id}`)}
                        />
                    ) : (
                        <ThemedText variant="muted" size="sm" style={{ marginLeft: 4 }}>
                            No {modeWord === 'transit' ? 'bus or train' : 'route'} gets you there by {formatTime(second.startTime)} from {jobName(first.job)}.
                        </ThemedText>
                    )}
                    <FixRow
                        icon={Clock3}
                        title={`Start ${jobName(second.job)} at ${formatTime(startAt)}`}
                        detail="When you can actually be there"
                        action="Edit"
                        onPress={() => router.push(`/edit-shift/${second.id}`)}
                    />
                </View>

                {trip && (
                    <>
                        <SectionLabel>{`BUS & TRAIN AFTER ${formatTime(first.endTime).toUpperCase()}`}</SectionLabel>
                        <TransitItineraryCard
                            itinerary={trip}
                            selected={false}
                            expanded={isTripOpen}
                            onPress={() => setIsTripOpen((open) => !open)}
                            leaveLabel={`Leave ${jobName(first.job)} at`}
                            destinationLabel={jobName(second.job)}
                        />
                    </>
                )}
            </>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Schedule issue" onCancel={close} onSave={close} saveLabel="Done" hideCancel />
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>{body()}</ScrollView>
        </View>
    );
}

function Hero({ icon: Icon, tone, title, subtitle }: { icon: typeof Clock3; tone: string; title: string; subtitle: string }) {
    return (
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(tone, 0.14) }}>
                <Icon color={tone} size={22} />
            </View>
            <View style={{ flex: 1 }}>
                <ThemedText size="xl" weight="bold">{title}</ThemedText>
                <ThemedText variant="secondary" size="sm" style={{ marginTop: 2 }}>{subtitle}</ThemedText>
            </View>
        </View>
    );
}
