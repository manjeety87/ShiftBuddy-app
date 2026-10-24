import { useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../constants/themes';
import { ARRIVAL_BUFFER_MAX_MINUTES, describeArriveByExample } from '../lib/commute';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { ThemedText } from './ui/ThemedText';
import { WheelPicker, WheelSelectionBand, type WheelItem } from './ui/WheelPicker';

const MINUTES: WheelItem<number>[] = Array.from({ length: ARRIVAL_BUFFER_MAX_MINUTES + 1 }, (_, minutes) => ({ label: String(minutes), value: minutes }));

interface ArrivalWheelSheetProps {
    visible: boolean;
    /** Where the wheel starts each time the sheet opens */
    initialMinutes: number;
    onClose: () => void;
    onSet: (minutes: number) => void;
}

/**
 * "Custom" arrival time: a minutes wheel like the iOS timer, the same wheel as the
 * app's time pickers. Saved only on Set, so spinning past values commits nothing.
 */
export function ArrivalWheelSheet({ visible, initialMinutes, onClose, onSet }: ArrivalWheelSheetProps) {
    const [minutes, setMinutes] = useState(initialMinutes);
    // Each opening starts from the saved value, not where the wheel was left last time
    const [openedWith, setOpenedWith] = useState<number | null>(null);
    if (visible && openedWith !== initialMinutes) {
        setOpenedWith(initialMinutes);
        setMinutes(initialMinutes);
    }
    if (!visible && openedWith !== null) setOpenedWith(null);

    return (
        <BottomSheet visible={visible} onClose={onClose} header={<ThemedText weight="semibold">Arrive early</ThemedText>}>
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <WheelSelectionBand />
                    <WheelPicker items={MINUTES} selectedIndex={minutes} width={88} onChange={setMinutes} />
                    {/* Fixed beside the wheel, like the iOS timer's "min" */}
                    <ThemedText size="lg" weight="semibold" style={{ width: 110 }}>min early</ThemedText>
                </View>
                <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg, fontVariant: ['tabular-nums'] }}>
                    {minutes === 0 ? 'Right on time — no room for a late bus.' : describeArriveByExample(minutes)}
                </ThemedText>
                <Button label="Set" onPress={() => onSet(minutes)} />
            </View>
        </BottomSheet>
    );
}
