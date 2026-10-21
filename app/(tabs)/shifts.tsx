import { router, useFocusEffect } from 'expo-router';
import { CalendarClock, CheckSquare, Copy, DollarSign, Plus, ScanLine, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, View } from 'react-native';
import { ShiftCard } from '../../components/ShiftCard';
import { ShiftHoursRow } from '../../components/ShiftHoursRow';
import { PressableScale } from '../../components/ui/PressableScale';
import { LoadError } from '../../components/ui/LoadError';
import { Screen, useScreenTopInset } from '../../components/ui/Screen';
import { ThemedText } from '../../components/ui/ThemedText';
import { spacing } from '../../constants/themes';
import type { Shift } from '../../interfaces/shift.d';
import { startOfDay } from '../../lib/daySegments';
import { formatDuration } from '../../lib/shiftTime';
import { getMyShifts } from '../../lib/shifts';
import { useTheme } from '../../lib/theme-context';
import { useFetch } from '../../lib/useFetch';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { deleteShiftsWithUndo } from '../../lib/shiftActions';
import { useShiftsChanged } from '../../lib/shiftEvents';
import { useTimesheetChanged } from '../../lib/timesheet';

type ListMode = 'upcoming' | 'past';

const PAST_DAYS = 90; // history long enough for a few pay periods
const DAY_MS = 24 * 60 * 60 * 1000;

const dayTitle = (day: Date) => {
    const today = startOfDay(new Date());
    const diff = Math.round((startOfDay(day).getTime() - today.getTime()) / DAY_MS);
    const date = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (diff === 0) return `Today · ${date}`;
    if (diff === 1) return `Tomorrow · ${date}`;
    if (diff === -1) return `Yesterday · ${date}`;
    return date;
};

interface DaySection {
    key: string;
    title: string;
    minutes: number;
    data: Shift[];
}

/** Shifts grouped under one header per day, in the order given. */
const groupByDay = (shifts: Shift[]): DaySection[] => {
    const sections: DaySection[] = [];
    for (const shift of shifts) {
        const day = startOfDay(new Date(shift.startTime));
        const key = day.toISOString();
        let section = sections[sections.length - 1];
        if (!section || section.key !== key) {
            section = { key, title: dayTitle(day), minutes: 0, data: [] };
            sections.push(section);
        }
        section.data.push(shift);
        section.minutes += Math.round((Date.parse(shift.endTime) - Date.parse(shift.startTime)) / 60000);
    }
    return sections;
};

export default function ShiftsScreen() {
    const { colors } = useTheme();
    const topInset = useScreenTopInset();
    const [mode, setMode] = useState<ListMode>('upcoming');
    // "Now" as state: refreshed on focus and each minute, so a shift moves from Upcoming to Past on its own
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    // Upcoming starts a day back so a shift that's already under way still shows (as "Now")
    const { data: shifts, isLoading, isRefreshing, error, refetch, refresh } = useFetch(() => {
        const now = Date.now();
        return mode === 'upcoming'
            ? getMyShifts({ from: new Date(now - DAY_MS).toISOString() })
            : getMyShifts({ from: new Date(now - PAST_DAYS * DAY_MS).toISOString(), to: new Date(now).toISOString() });
    }, [mode]);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    useFocusEffect(useCallback(() => { setNow(Date.now()); refetch(); }, [refetch]));
    useShiftsChanged(refetch);
    useTimesheetChanged(refetch); // hours added or changed from a past shift show up on its row

    const visible = useMemo(() => {
        const list = (shifts ?? []).filter((s) => (mode === 'upcoming' ? Date.parse(s.endTime) > now : Date.parse(s.endTime) <= now));
        return mode === 'past' ? [...list].reverse() : list; // past: most recent first
    }, [shifts, mode, now]);
    const sections = useMemo(() => groupByDay(visible), [visible]);

    const enterSelectionMode = (id: string) => { setSelectionMode(true); setSelectedIds(new Set([id])); };
    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };
    const selectAll = () => setSelectedIds(new Set(visible.map((s) => s.id)));

    const switchMode = (next: ListMode) => {
        if (next === mode) return;
        exitSelectionMode();
        setMode(next);
    };

    const handleCopySelected = () => {
        if (selectedIds.size === 0) return;
        router.push(`/copy-shifts?ids=${[...selectedIds].join(',')}`);
        exitSelectionMode();
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        const toDelete = visible.filter((s) => selectedIds.has(s.id));
        setIsDeleting(true);
        await deleteShiftsWithUndo(toDelete, refetch);
        setIsDeleting(false);
        exitSelectionMode();
    };

    const roundButton = (onPress: () => void, children: React.ReactNode, options: { label: string; filled?: boolean; danger?: boolean; disabled?: boolean }) => (
        <PressableScale
            onPress={onPress}
            disabled={options.disabled}
            accessibilityRole="button"
            accessibilityLabel={options.label}
            style={{
                width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                backgroundColor: options.danger ? colors.danger : options.filled ? colors.primary : colors.surface,
                opacity: options.disabled ? 0.4 : 1,
            }}
        >
            {children}
        </PressableScale>
    );

    return (
        <Screen>
            <View style={{ paddingTop: topInset, paddingHorizontal: spacing.lg, flex: 1 }}>
                {selectionMode ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, minHeight: 40 }}>
                        <PressableScale onPress={exitSelectionMode} pressedScale={1} pressedStyle={{ opacity: 0.6 }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <X color={colors.textPrimary} size={20} />
                            <ThemedText weight="medium">{selectedIds.size} selected</ThemedText>
                        </PressableScale>
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                            {roundButton(selectAll, <CheckSquare color={colors.textPrimary} size={18} />, { label: 'Select all' })}
                            {roundButton(handleCopySelected, <Copy color={colors.textPrimary} size={18} />, { label: 'Copy selected shifts', disabled: selectedIds.size === 0 })}
                            {roundButton(
                                handleDeleteSelected,
                                isDeleting ? <ActivityIndicator color="white" size="small" /> : <Trash2 color="white" size={18} />,
                                { label: 'Delete selected shifts', danger: true, disabled: selectedIds.size === 0 || isDeleting }
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, minHeight: 40 }}>
                        <ThemedText size="2xl" weight="bold">Shifts</ThemedText>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {roundButton(() => router.push('/pay-summary'), <DollarSign color={colors.textPrimary} size={20} />, { label: 'Pay summary' })}
                            {roundButton(() => router.push('/import-schedule'), <ScanLine color={colors.textPrimary} size={20} />, { label: 'Scan a schedule' })}
                            {roundButton(() => router.push('/create-shift'), <Plus color={colors.onPrimary} size={22} />, { label: 'Add a shift', filled: true })}
                        </View>
                    </View>
                )}

                <View style={{ marginBottom: spacing.md }}>
                    <SegmentedControl
                        options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]}
                        value={mode}
                        onChange={switchMode}
                        accessibilityLabel="Which shifts"
                    />
                </View>

                {isLoading && !shifts ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : error && !shifts ? (
                    <LoadError message={error} onRetry={refresh} pullToRefresh={{ isRefreshing }} />
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        stickySectionHeadersEnabled
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
                        renderSectionHeader={({ section }) => (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: spacing.sm, paddingBottom: 6, backgroundColor: colors.background }}>
                                <ThemedText size="sm" weight="semibold" variant="secondary">{section.title}</ThemedText>
                                <ThemedText size="xs" variant="muted">{formatDuration(section.minutes)}</ThemedText>
                            </View>
                        )}
                        renderItem={({ item }) => {
                            // A finished shift shows the hours clocked for it. Nothing clocked = nothing
                            // extra here; adding hours is on the shift's own screen
                            const showHours = mode === 'past' && !selectionMode && !!item.timeEntries?.length;
                            return (
                                <>
                                    <ShiftCard
                                        shift={item}
                                        isNow={Date.parse(item.startTime) <= now && Date.parse(item.endTime) > now}
                                        selectionMode={selectionMode}
                                        selected={selectedIds.has(item.id)}
                                        hasFooter={showHours}
                                        onPress={() => (selectionMode ? toggleSelection(item.id) : router.push(`/edit-shift/${item.id}`))}
                                        onLongPress={() => { if (!selectionMode) enterSelectionMode(item.id); }}
                                    />
                                    {showHours && <ShiftHoursRow shift={item} attached />}
                                </>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 64, gap: spacing.md }}>
                                <CalendarClock color={colors.textMuted} size={44} />
                                <ThemedText variant="muted" style={{ textAlign: 'center' }}>
                                    {mode === 'upcoming' ? 'No upcoming shifts. Tap + to add one, or scan a schedule.' : `No shifts in the last ${PAST_DAYS} days.`}
                                </ThemedText>
                            </View>
                        }
                        ListFooterComponent={
                            mode === 'past' && visible.length > 0 ? (
                                <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.md }}>Showing the last {PAST_DAYS} days</ThemedText>
                            ) : null
                        }
                        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
                    />
                )}
            </View>
        </Screen>
    );
}
