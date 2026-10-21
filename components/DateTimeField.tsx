import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { radius, spacing } from '../constants/themes';
import { formatDate, formatTime, fromCalendarDateString, toCalendarDateString } from '../lib/dateUtils';
import { useTheme } from '../lib/theme-context';
import { ThemedText } from './ui/ThemedText';
import { TimeWheel } from './ui/TimeWheel';
import { PressableScale } from './ui/PressableScale';
import { BottomSheet } from './ui/BottomSheet';
import { TextButton } from './ui/Button';

interface DateTimeFieldProps {
    mode: 'date' | 'time';
    value: Date;
    onChange: (value: Date) => void;
    /** Also the title of the picker sheet */
    accessibilityLabel: string;
    /** Small note under the value, e.g. "next day" */
    hint?: string;
    minuteInterval?: 1 | 5 | 10 | 15 | 30;
}

/**
 * A date or time shown as a tappable pill. Tapping opens the same bottom sheet
 * on both platforms — the native wheel/calendar on iOS, matching wheels and a
 * calendar on Android — and nothing changes until Done.
 */
export function DateTimeField({ mode, value, onChange, accessibilityLabel, hint, minuteInterval = 5 }: DateTimeFieldProps) {
    const { colors } = useTheme();
    const [draft, setDraft] = useState<Date | null>(null); // the sheet is open while non-null

    const handleDone = () => {
        if (draft) onChange(draft);
        setDraft(null);
    };

    const label = mode === 'date' ? formatDate(value.toISOString()) : formatTime(value.toISOString());

    const renderPicker = (current: Date) => {
        if (Platform.OS === 'ios') {
            return (
                <DateTimePicker
                    value={current}
                    mode={mode}
                    display={mode === 'date' ? 'inline' : 'spinner'}
                    minuteInterval={mode === 'time' ? minuteInterval : undefined}
                    onChange={(_event, selected) => selected && setDraft(selected)}
                    themeVariant={colors.isDark ? 'dark' : 'light'}
                    accentColor={colors.primary}
                    textColor={colors.textPrimary}
                    style={{ alignSelf: 'center' }}
                />
            );
        }
        if (mode === 'time') {
            return (
                <View style={{ paddingVertical: spacing.md }}>
                    <TimeWheel value={current} onChange={setDraft} minuteInterval={minuteInterval} />
                </View>
            );
        }
        const selectedKey = toCalendarDateString(current.toISOString());
        return (
            <Calendar
                current={selectedKey}
                markedDates={{ [selectedKey]: { selected: true, selectedColor: colors.primary } }}
                onDayPress={(day: DateData) => {
                    // Keep the time part; only the day changes
                    const picked = fromCalendarDateString(day.dateString);
                    picked.setHours(current.getHours(), current.getMinutes(), 0, 0);
                    setDraft(picked);
                }}
                enableSwipeMonths
                theme={{
                    calendarBackground: colors.surface,
                    textSectionTitleColor: colors.textMuted,
                    dayTextColor: colors.textPrimary,
                    textDisabledColor: colors.textMuted,
                    monthTextColor: colors.textPrimary,
                    textMonthFontWeight: '700',
                    todayTextColor: colors.primary,
                    arrowColor: colors.primary,
                    selectedDayBackgroundColor: colors.primary,
                    selectedDayTextColor: colors.onPrimary,
                }}
            />
        );
    };

    return (
        <>
            <PressableScale
                onPress={() => setDraft(value)}
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityLabel}: ${label}${hint ? `, ${hint}` : ''}`}
                style={{ alignItems: 'flex-end' }} pressedScale={0.96}
            >
                <View style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: colors.surfaceLight }}>
                    <ThemedText weight="medium" style={{ fontVariant: ['tabular-nums'] }}>{label}</ThemedText>
                </View>
                {hint && <ThemedText size="xs" color={colors.primary} weight="medium" style={{ marginTop: 3 }}>{hint}</ThemedText>}
            </PressableScale>

            <BottomSheet
                visible={draft !== null}
                onClose={() => setDraft(null)}
                header={
                    <>
                        <TextButton label="Cancel" color={colors.textSecondary} weight="normal" onPress={() => setDraft(null)} />
                        <ThemedText weight="semibold">{accessibilityLabel}</ThemedText>
                        <TextButton label="Done" onPress={handleDone} />
                    </>
                }
            >
                {draft && renderPicker(draft)}
            </BottomSheet>
        </>
    );
}
