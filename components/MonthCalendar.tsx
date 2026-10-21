import { View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { radius, spacing } from '../constants/themes';
import { fromCalendarDateString, toCalendarDateString } from '../lib/dateUtils';
import { useTheme } from '../lib/theme-context';

const MAX_DOTS_PER_DAY = 3; // more than this stops reading as dots

interface MonthCalendarProps {
    selectedDate: Date;
    onSelect: (date: Date) => void;
    /** "YYYY-MM-DD" → colours of the jobs working that day (same shape WeekDateStrip takes) */
    jobColorsByDate: Record<string, string[]>;
}

/** A themed month grid with one dot per job working that day. Swiping or the arrows select the 1st of that month. */
export function MonthCalendar({ selectedDate, onSelect, jobColorsByDate }: MonthCalendarProps) {
    const { colors } = useTheme();
    const selectedKey = toCalendarDateString(selectedDate.toISOString());

    const markedDates: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    Object.entries(jobColorsByDate).forEach(([key, dayColors]) => {
        markedDates[key] = { dots: dayColors.slice(0, MAX_DOTS_PER_DAY).map((color) => ({ key: color, color })) };
    });
    markedDates[selectedKey] = { dots: markedDates[selectedKey]?.dots ?? [], selected: true, selectedColor: colors.primary };

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, paddingBottom: spacing.sm, overflow: 'hidden' }}>
            <Calendar
                key={colors.background /* re-theme when the app theme changes */}
                current={selectedKey}
                markingType="multi-dot"
                markedDates={markedDates}
                onDayPress={(day: DateData) => onSelect(fromCalendarDateString(day.dateString))}
                // Moving months selects the 1st, so the data on screen follows the visible month
                onMonthChange={(month: DateData) => onSelect(new Date(month.year, month.month - 1, 1))}
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
        </View>
    );
}
