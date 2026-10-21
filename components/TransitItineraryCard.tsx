import { ChevronDown, ChevronRight, Footprints } from 'lucide-react-native';
import { View } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { radius, spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { formatTime } from '../lib/dateUtils';
import { EASE_OUT, motion } from '../lib/motion';
import { useTheme } from '../lib/theme-context';
import { isWalk, type TransitItinerary, type TransitLeg } from '../lib/transit';
import { LineBadge } from './LineBadge';
import { TransitSteps } from './TransitSteps';
import { ThemedText } from './ui/ThemedText';
import { PressableScale } from './ui/PressableScale';

function LegSummary({ legs }: { legs: TransitLeg[] }) {
    const { colors } = useTheme();
    // Short walks between stops are noise in the summary row — keep the first/last and any long ones.
    const shown = legs.filter((leg, i) => !isWalk(leg) || i === 0 || i === legs.length - 1 || leg.durationMinutes >= 5);
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            {shown.map((leg, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {i > 0 && <ChevronRight color={colors.textMuted} size={12} />}
                    {isWalk(leg) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Footprints color={colors.textSecondary} size={13} />
                            <ThemedText variant="secondary" size="xs">{leg.durationMinutes}</ThemedText>
                        </View>
                    ) : (
                        <LineBadge leg={leg} />
                    )}
                </View>
            ))}
        </View>
    );
}

/** Points down when collapsed, up when open — turns rather than swapping icons. */
function ExpandChevron({ expanded, color }: { expanded: boolean; color: string }) {
    const rotation = useSharedValue(expanded ? 180 : 0);
    useEffect(() => {
        rotation.set(withTiming(expanded ? 180 : 0, { duration: 200, easing: EASE_OUT }));
    }, [expanded, rotation]);
    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
    return (
        <Animated.View style={style}>
            <ChevronDown color={color} size={16} />
        </Animated.View>
    );
}

interface TransitItineraryCardProps {
    itinerary: TransitItinerary;
    selected: boolean;
    expanded: boolean;
    onPress: () => void;
    /** "Leave home by" / "Leave by" */
    leaveLabel: string;
    destinationLabel: string;
}

export function TransitItineraryCard({ itinerary, selected, expanded, onPress, leaveLabel, destinationLabel }: TransitItineraryCardProps) {
    const { colors } = useTheme();
    const firstRide = itinerary.legs.find((leg) => !isWalk(leg));
    const details = [
        `${leaveLabel} ${formatTime(itinerary.departure)}`,
        itinerary.transfers === 0 ? 'No transfers' : `${itinerary.transfers} transfer${itinerary.transfers === 1 ? '' : 's'}`,
        `${itinerary.walkMinutes} min walk`,
    ];

    return (
        <Animated.View layout={motion.layout}>
            <PressableScale
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ selected, expanded }}
                accessibilityHint={expanded ? 'Hides the steps' : 'Shows every step of this trip'}
                pressedScale={0.98}
                style={{
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    // Same width either way, so selecting a card doesn't nudge the layout
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.surfaceLight,
                    // Static shadow — re-rendering elevation on every press is costly on Android
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <ThemedText size="lg" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
                        {formatTime(itinerary.departure)} – {formatTime(itinerary.arrival)}
                    </ThemedText>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: withAlpha(colors.primary, 0.12) }}>
                        <ThemedText size="sm" weight="semibold" color={colors.primary}>{itinerary.durationMinutes} min</ThemedText>
                    </View>
                </View>
                <LegSummary legs={itinerary.legs} />
                {firstRide?.from.name && (
                    <ThemedText variant="secondary" size="sm" style={{ marginTop: spacing.sm }}>
                        Catch {firstRide.line ?? 'it'} at <ThemedText size="sm" weight="semibold">{formatTime(firstRide.departure)}</ThemedText> from {firstRide.from.name}
                    </ThemedText>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 }}>
                    <ThemedText variant="muted" size="xs" style={{ flex: 1 }} numberOfLines={1}>{details.join(' · ')}</ThemedText>
                    <ThemedText size="xs" weight="semibold" color={colors.primary}>{expanded ? 'Hide' : 'Steps'}</ThemedText>
                    <ExpandChevron expanded={expanded} color={colors.primary} />
                </View>

                {expanded && <TransitSteps legs={itinerary.legs} destinationLabel={destinationLabel} />}
            </PressableScale>
        </Animated.View>
    );
}
