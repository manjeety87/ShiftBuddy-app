import { View } from 'react-native';
import { WheelPicker, WheelSelectionBand, type WheelItem } from './WheelPicker';

const HOURS: WheelItem<number>[] = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
const PERIODS: WheelItem<'AM' | 'PM'>[] = [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }];

const minuteItems = (step: number): WheelItem<number>[] =>
    Array.from({ length: 60 / step }, (_, i) => ({ label: String(i * step).padStart(2, '0'), value: i * step }));

interface TimeWheelProps {
    value: Date;
    onChange: (value: Date) => void;
    minuteInterval?: 1 | 5 | 10 | 15 | 30;
}

/** Hour · minute · AM/PM wheels — the iOS time picker, for platforms that don't have one. */
export function TimeWheel({ value, onChange, minuteInterval = 5 }: TimeWheelProps) {
    const minutes = minuteItems(minuteInterval);
    const hours24 = value.getHours();
    const hourIndex = (hours24 % 12 || 12) - 1;
    const minuteIndex = Math.min(minutes.length - 1, Math.round(value.getMinutes() / minuteInterval));
    const periodIndex = hours24 >= 12 ? 1 : 0;

    const update = (hour12: number, minute: number, period: 'AM' | 'PM') => {
        const next = new Date(value);
        next.setHours((hour12 % 12) + (period === 'PM' ? 12 : 0), minute, 0, 0);
        onChange(next);
    };

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <WheelSelectionBand />
            <WheelPicker items={HOURS} selectedIndex={hourIndex} width={72}
                onChange={(i) => update(HOURS[i].value, minutes[minuteIndex].value, PERIODS[periodIndex].value)} />
            <WheelPicker items={minutes} selectedIndex={minuteIndex} width={72}
                onChange={(i) => update(HOURS[hourIndex].value, minutes[i].value, PERIODS[periodIndex].value)} />
            <WheelPicker items={PERIODS} selectedIndex={periodIndex} width={72}
                onChange={(i) => update(HOURS[hourIndex].value, minutes[minuteIndex].value, PERIODS[i].value)} />
        </View>
    );
}
