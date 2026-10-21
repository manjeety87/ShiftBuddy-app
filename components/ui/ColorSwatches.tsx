import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { readableTextOn } from '../../lib/color';
import { PressableScale } from './PressableScale';

interface ColorSwatchesProps {
    colors: readonly string[];
    selected: string | null;
    onSelect: (color: string) => void;
    /** What the colour is for, read out with each swatch ("Job colour") */
    label: string;
}

/** A row of colour dots; the chosen one carries a check mark (not just a thin ring that's easy to miss). */
export function ColorSwatches({ colors, selected, onSelect, label }: ColorSwatchesProps) {
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {colors.map((color, i) => {
                const isSelected = selected?.toLowerCase() === color.toLowerCase();
                return (
                    <PressableScale
                        key={color}
                        onPress={() => onSelect(color)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`${label} ${i + 1}`}
                        hitSlop={4}
                        pressedScale={0.9}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
                    >
                        {isSelected && <Check color={readableTextOn(color)} size={20} strokeWidth={3} />}
                    </PressableScale>
                );
            })}
        </View>
    );
}
