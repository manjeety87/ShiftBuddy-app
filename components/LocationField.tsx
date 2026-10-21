import { MapPin, X } from 'lucide-react-native';
import { useState } from 'react';
import { radius } from '../constants/themes';
import type { Place } from '../interfaces/user.d';
import { useTheme } from '../lib/theme-context';
import { LocationPicker } from './LocationPicker';
import { IconButton } from './ui/Button';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

interface LocationFieldProps {
    value: Place | null;
    onChange: (place: Place | null) => void;
    placeholder?: string;
    pickerTitle?: string;
}

/** Form row that shows a picked place and opens the map picker; × clears it. */
export function LocationField({ value, onChange, placeholder = 'Tap to set location on map', pickerTitle }: LocationFieldProps) {
    const { colors } = useTheme();
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    return (
        <>
            <PressableScale
                onPress={() => setIsPickerOpen(true)}
                accessibilityRole="button"
                accessibilityHint="Opens a map to choose the location"
                pressedScale={0.98}
                style={{ backgroundColor: colors.surface, minHeight: 48, borderRadius: radius.md, paddingLeft: 16, paddingRight: 6, flexDirection: 'row', alignItems: 'center' }}
            >
                <MapPin color={value ? colors.primary : colors.textMuted} size={18} />
                <ThemedText color={value ? colors.textPrimary : colors.textMuted} style={{ marginLeft: 8, flex: 1, paddingVertical: 12 }} numberOfLines={2}>
                    {value?.address || placeholder}
                </ThemedText>
                {value && <IconButton icon={X} appearance="plain" color={colors.textMuted} size={32} accessibilityLabel="Clear location" onPress={() => onChange(null)} />}
            </PressableScale>

            <LocationPicker
                visible={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onConfirm={onChange}
                initial={value}
                title={pickerTitle}
            />
        </>
    );
}
