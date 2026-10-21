import { Bus, Footprints, Ship, TrainFront, TramFront } from 'lucide-react-native';
import { View } from 'react-native';
import { readableTextOn } from '../lib/color';
import { useTheme } from '../lib/theme-context';
import { modeLabel, type TransitLeg, type TransitMode } from '../lib/transit';
import { ThemedText } from './ui/ThemedText';

export function ModeIcon({ mode, color, size = 14 }: { mode: TransitMode; color: string; size?: number }) {
    switch (mode) {
        case 'WALK': return <Footprints color={color} size={size} />;
        case 'SUBWAY':
        case 'METRO':
        case 'RAIL':
        case 'REGIONAL_RAIL': return <TrainFront color={color} size={size} />;
        case 'TRAM': return <TramFront color={color} size={size} />;
        case 'FERRY': return <Ship color={color} size={size} />;
        default: return <Bus color={color} size={size} />;
    }
}

/** The coloured "97" / "Line 2" pill, in the agency's own colours. */
export function LineBadge({ leg }: { leg: TransitLeg }) {
    const { colors } = useTheme();
    const background = leg.color ?? colors.surfaceLight;
    const foreground = leg.textColor ?? (leg.color ? readableTextOn(leg.color) : colors.textPrimary);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: background, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
            <ModeIcon mode={leg.mode} color={foreground} size={12} />
            <ThemedText size="xs" weight="bold" color={foreground}>{leg.line ?? modeLabel(leg.mode)}</ThemedText>
        </View>
    );
}
