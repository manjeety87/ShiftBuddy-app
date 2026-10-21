import { CalendarDays, Clock3, Clock9, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import { formatDuration, MIN_SHIFT_MINUTES, resolveShiftRange, withNewStart, type ShiftTimes } from '../lib/shiftTime';
import { useTheme } from '../lib/theme-context';
import { DateTimeField } from './DateTimeField';
import { ThemedText } from './ui/ThemedText';

interface ShiftTimeFieldsProps {
    value: ShiftTimes;
    onChange: (value: ShiftTimes) => void;
}

function Row({ icon: Icon, label, children, isFirst }: { icon: LucideIcon; label: string; children: ReactNode; isFirst?: boolean }) {
    const { colors } = useTheme();
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 10,
                borderTopWidth: isFirst ? 0 : 1,
                borderTopColor: colors.surfaceLight,
            }}
        >
            <Icon color={colors.textSecondary} size={18} />
            <ThemedText style={{ flex: 1 }}>{label}</ThemedText>
            {children}
        </View>
    );
}

/** Date + start + end as one grouped card (like a calendar app's event editor), with the shift length underneath. */
export function ShiftTimeFields({ value, onChange }: ShiftTimeFieldsProps) {
    const { colors } = useTheme();
    const range = resolveShiftRange(value);
    const isSameTime = range.durationMinutes === 24 * 60;
    const isShort = !isSameTime && range.durationMinutes < MIN_SHIFT_MINUTES;

    return (
        <View style={{ marginBottom: spacing.lg }}>
            <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>WHEN</ThemedText>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
                <Row icon={CalendarDays} label="Date" isFirst>
                    <DateTimeField mode="date" value={value.date} onChange={(date) => onChange({ ...value, date })} accessibilityLabel="Date" />
                </Row>
                <Row icon={Clock9} label="Starts">
                    <DateTimeField mode="time" value={value.start} onChange={(start) => onChange(withNewStart(value, start))} accessibilityLabel="Starts" />
                </Row>
                <Row icon={Clock3} label="Ends">
                    <DateTimeField
                        mode="time"
                        value={value.end}
                        onChange={(end) => onChange({ ...value, end })}
                        accessibilityLabel="Ends"
                        hint={range.isOvernight && !isSameTime ? 'next day' : undefined}
                    />
                </Row>
            </View>
            <ThemedText size="sm" style={{ marginTop: 8, marginLeft: 4 }} color={isSameTime ? colors.danger : isShort ? colors.warning : colors.textSecondary}>
                {isSameTime
                    ? 'Start and end are the same time — change one of them.'
                    : `${formatDuration(range.durationMinutes)} shift${range.isOvernight ? ' · ends the next day' : ''}${isShort ? ' · under the 3-hour minimum' : ''}`}
            </ThemedText>
        </View>
    );
}
