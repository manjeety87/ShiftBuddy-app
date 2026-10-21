import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { Shift } from '../interfaces/shift.d';
import { formatDate, formatTime, toCalendarDateString } from '../lib/dateUtils';
import { startOfDay } from '../lib/daySegments';
import { copyShifts, getShiftById } from '../lib/shifts';
import { useTheme } from '../lib/theme-context';
import { PressableScale } from '../components/ui/PressableScale';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { notify } from '../lib/notify';
import { jobName } from '../lib/jobLabels';
import { Button } from '../components/ui/Button';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

const MAX_LISTED = 3;

const QUICK_PICKS = [
    { label: 'Next Day', days: 1 },
    { label: 'Next Week', days: 7 },
    { label: 'In 2 Weeks', days: 14 },
];

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

/** Copy one or more shifts onto other days: `/copy-shifts?ids=a,b,c`. */
export default function CopyShiftsScreen() {
    const { colors } = useTheme();
    const { ids } = useLocalSearchParams<{ ids: string }>();

    const [shifts, setShifts] = useState<Shift[] | null>(null);
    const [targetDates, setTargetDates] = useState<Set<string>>(new Set());
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        const shiftIds = (ids ?? '').split(',').filter(Boolean);
        Promise.all(shiftIds.map(getShiftById))
            .then((loaded) => setShifts(loaded.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))))
            .catch(() => {
                showAlert('Error', 'Could not load the shifts to copy.');
                router.back();
            });
    }, [ids]);

    // The day the selection starts on — each picked day gets the copy of this day
    const anchorDay = useMemo(() => (shifts?.length ? startOfDay(new Date(shifts[0].startTime)) : null), [shifts]);
    const today = toCalendarDateString(new Date().toISOString());

    const toggleDate = (dateString: string) => {
        setTargetDates((prev) => {
            const next = new Set(prev);
            if (next.has(dateString)) next.delete(dateString);
            else next.add(dateString);
            return next;
        });
    };

    const markedDates = useMemo(() => {
        const marked: Record<string, { selected: boolean; selectedColor: string; marked?: boolean; dotColor?: string }> = {};
        targetDates.forEach((date) => {
            marked[date] = { selected: true, selectedColor: colors.primary };
        });
        // Show where the originals are, so it's clear what "Next Week" means
        shifts?.forEach((shift) => {
            const key = toCalendarDateString(shift.startTime);
            marked[key] = { ...marked[key], selected: marked[key]?.selected ?? false, selectedColor: colors.primary, marked: true, dotColor: shift.job.color };
        });
        return marked;
    }, [targetDates, shifts, colors.primary]);

    const handleCopy = async () => {
        if (!shifts || targetDates.size === 0) return;
        setIsCopying(true);
        try {
            const { created, skipped } = await copyShifts({ shiftIds: shifts.map((s) => s.id), targetDates: [...targetDates] });
            const copied = `${created.length} shift${created.length !== 1 ? 's' : ''} copied.`;
            const skippedNote = skipped.length > 0
                ? `\n${skipped.length} skipped — you already have a shift at ${skipped.length === 1 ? 'that time' : 'those times'}.`
                : '';
            if (created.length > 0) notify.success(copied.replace(/\.$/, ''), { description: skippedNote.trim() || undefined });
            else notify.info('Nothing copied', { description: skippedNote.trim() || undefined });
            router.back();
        } catch (err: any) {
            showAlert('Could not copy shifts', err?.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsCopying(false);
        }
    };

    if (!shifts || !anchorDay) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const isMultiDay = new Set(shifts.map((s) => toCalendarDateString(s.startTime))).size > 1;
    const copyCount = shifts.length * targetDates.size;
    const anchorWeekday = anchorDay.toLocaleDateString('en-US', { weekday: 'long' });

    return (
        <KeyboardSafeView>
            <SheetHeader title={shifts.length === 1 ? 'Copy Shift' : `Copy ${shifts.length} Shifts`} onCancel={() => router.back()} />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm }}>
                    {shifts.slice(0, MAX_LISTED).map((shift) => (
                        <View key={shift.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: shift.job.color }} />
                            <ThemedText weight="medium" style={{ flex: 1 }} numberOfLines={1}>{jobName(shift.job)}</ThemedText>
                            <ThemedText variant="secondary" size="sm">
                                {formatDate(shift.startTime)} · {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
                            </ThemedText>
                        </View>
                    ))}
                    {shifts.length > MAX_LISTED && (
                        <ThemedText variant="muted" size="sm">+{shifts.length - MAX_LISTED} more</ThemedText>
                    )}
                </View>

                <ThemedText variant="secondary" size="sm" style={{ marginBottom: 8 }}>Copy to</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
                    {QUICK_PICKS.map((pick) => {
                        const dateString = toCalendarDateString(addDays(anchorDay, pick.days).toISOString());
                        const isOn = targetDates.has(dateString);
                        return (
                            <PressableScale
                                key={pick.label}
                                onPress={() => toggleDate(dateString)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isOn }}
                                style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: isOn ? colors.primary : colors.surface }}
                            >
                                <ThemedText size="sm" weight="medium" color={isOn ? colors.onPrimary : colors.textPrimary}>{pick.label}</ThemedText>
                            </PressableScale>
                        );
                    })}
                </View>

                <ThemedText variant="muted" size="xs" style={{ marginBottom: spacing.sm }}>
                    {isMultiDay
                        ? `Pick the day your ${anchorWeekday} shift should land on — the others keep the same spacing.`
                        : 'Or tap any days below. Times stay the same.'}
                </ThemedText>

                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg }}>
                    <Calendar
                        minDate={today}
                        onDayPress={(day: DateData) => toggleDate(day.dateString)}
                        markedDates={markedDates}
                        theme={{
                            backgroundColor: colors.surface,
                            calendarBackground: colors.surface,
                            textSectionTitleColor: colors.textMuted,
                            dayTextColor: colors.textPrimary,
                            textDisabledColor: colors.textMuted,
                            monthTextColor: colors.textPrimary,
                            todayTextColor: colors.primary,
                            arrowColor: colors.primary,
                            selectedDayBackgroundColor: colors.primary,
                            selectedDayTextColor: colors.onPrimary,
                        }}
                    />
                </View>

                <Button
                    label={targetDates.size === 0
                        ? 'Pick at least one day'
                        : `Copy to ${targetDates.size} Day${targetDates.size !== 1 ? 's' : ''} (${copyCount} shift${copyCount !== 1 ? 's' : ''})`}
                    onPress={handleCopy}
                    isLoading={isCopying}
                    disabled={copyCount === 0}
                    style={{ marginBottom: spacing.md }}
                />
            </ScrollView>
        </KeyboardSafeView>
    );
}
