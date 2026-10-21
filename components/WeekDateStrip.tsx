import { View } from 'react-native';
import { radius } from '../constants/themes';
import { isSameDay, toCalendarDateString } from '../lib/dateUtils';
import { useTheme } from '../lib/theme-context';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

const MAX_DOTS = 3;

interface WeekDateStripProps {
    days: Date[];
    selectedDate: Date;
    onSelect: (date: Date) => void;
    /** "YYYY-MM-DD" → colours of the jobs working that day */
    jobColorsByDate: Record<string, string[]>;
}

/** The seven days of a week side by side — all visible at once, one dot per job working that day. */
export function WeekDateStrip({ days, selectedDate, onSelect, jobColorsByDate }: WeekDateStripProps) {
    const { colors } = useTheme();
    const today = new Date();

    return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
            {days.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, today);
                const dots = (jobColorsByDate[toCalendarDateString(day.toISOString())] ?? []).slice(0, MAX_DOTS);

                return (
                    <PressableScale
                        key={day.toISOString()}
                        onPress={() => onSelect(day)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${dots.length ? ', has shifts' : ''}`}
                        pressedScale={0.94}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: 10,
                            borderRadius: radius.md,
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                        }}
                    >
                        <ThemedText size="xs" weight="medium" color={isSelected ? colors.onPrimary : isToday ? colors.primary : colors.textMuted}>
                            {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </ThemedText>
                        <ThemedText size="lg" weight="bold" color={isSelected ? colors.onPrimary : colors.textPrimary} style={{ marginVertical: 2 }}>
                            {day.getDate()}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
                            {dots.map((color) => (
                                <View key={color} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isSelected ? colors.onPrimary : color }} />
                            ))}
                        </View>
                    </PressableScale>
                );
            })}
        </View>
    );
}
