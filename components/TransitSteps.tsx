import { Footprints } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '../constants/themes';
import { formatTime } from '../lib/dateUtils';
import { motion } from '../lib/motion';
import { useTheme } from '../lib/theme-context';
import { formatDistance, isWalk, modeLabel, type TransitLeg } from '../lib/transit';
import { LineBadge } from './LineBadge';
import { PressableScale } from './ui/PressableScale';
import { ThemedText } from './ui/ThemedText';

/** A trip step by step: a rail of times on the left (solid for rides, dotted for walks), each ride in its own card. */
const TIME_COLUMN = 56;
const RAIL_COLUMN = 14;

interface TransitStepsProps {
    legs: TransitLeg[];
    destinationLabel: string;
}

export function TransitSteps(props: TransitStepsProps) {
    const { colors } = useTheme();
    return (
        <Animated.View
            entering={motion.appear}
            exiting={motion.disappear}
            style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.surfaceLight }}
        >
            <RailCards {...props} />
        </Animated.View>
    );
}

// ─── shared pieces ──────────────────────────────────────────────────────────

function TimeLabel({ iso }: { iso: string }) {
    return (
        <ThemedText variant="muted" size="xs" style={{ width: TIME_COLUMN, textAlign: 'center', paddingTop: 1, fontVariant: ['tabular-nums'] }}>
            {formatTime(iso)}
        </ThemedText>
    );
}

/**
 * A stop or direction on one line, like the rest of the steps. Someone new to the
 * area can tap it to read the whole name (to match it against the sign at the stop)
 * and tap again to fold it back. Same as the web app's route panel.
 */
function FullName({ text, weight, fill = false }: { text: string; weight: 'medium' | 'semibold'; fill?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <PressableScale onPress={() => setOpen((value) => !value)} pressedScale={1} pressedStyle={{ opacity: 0.6 }} accessibilityRole="button" style={fill ? { flex: 1 } : undefined}>
            <ThemedText size="sm" weight={weight} numberOfLines={open ? undefined : 1}>{text}</ThemedText>
        </PressableScale>
    );
}

/** Dot + the line running down to the next step: solid in the line's colour for a ride, dotted for a walk. */
function Rail({ color, walk, last }: { color: string; walk: boolean; last?: boolean }) {
    const { colors } = useTheme();
    return (
        <View style={{ alignItems: 'center', width: RAIL_COLUMN }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color, backgroundColor: last ? color : colors.surface, marginTop: 3 }} />
            {!last && (
                <View
                    style={{
                        flex: 1,
                        width: walk ? 0 : 4,
                        borderLeftWidth: walk ? 2 : 0,
                        borderStyle: walk ? 'dotted' : 'solid',
                        borderColor: color,
                        backgroundColor: walk ? 'transparent' : color,
                        borderRadius: 2,
                        marginVertical: 2,
                    }}
                />
            )}
        </View>
    );
}

const walkText = (leg: TransitLeg, where: string) =>
    `Walk ${leg.durationMinutes} min${leg.distanceMeters ? ` (${formatDistance(leg.distanceMeters)})` : ''} to ${where}`;

function RideCard({ leg, where }: { leg: TransitLeg; where: string }) {
    const { colors } = useTheme();
    return (
        <View style={{ backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceLight, padding: spacing.sm, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <LineBadge leg={leg} />
                <FullName text={leg.headsign ?? leg.lineName ?? modeLabel(leg.mode)} weight="medium" fill />
            </View>
            <ThemedText variant="secondary" size="xs">
                Get off at {where} · {formatTime(leg.arrival)}
            </ThemedText>
            <ThemedText variant="muted" size="xs">
                {leg.stopCount} stop{leg.stopCount === 1 ? '' : 's'} · {leg.durationMinutes} min
            </ThemedText>
        </View>
    );
}

// ─── 3. Rail + Cards ────────────────────────────────────────────────────────

function RailCards({ legs, destinationLabel }: TransitStepsProps) {
    const { colors } = useTheme();
    return (
        <View>
            {legs.map((leg, i) => {
                const walk = isWalk(leg);
                const where = leg.to.name ?? destinationLabel;
                return (
                    <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <TimeLabel iso={leg.departure} />
                        <Rail color={walk ? colors.textMuted : leg.color ?? colors.primary} walk={walk} />
                        <View style={{ flex: 1, paddingBottom: spacing.md, gap: 6 }}>
                            <FullName text={leg.from.name ?? 'Start'} weight="semibold" />
                            {walk ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Footprints color={colors.textSecondary} size={13} />
                                    <ThemedText variant="secondary" size="sm" style={{ flex: 1 }}>{walkText(leg, where)}</ThemedText>
                                </View>
                            ) : (
                                <RideCard leg={leg} where={where} />
                            )}
                        </View>
                    </View>
                );
            })}
            <Arrival legs={legs} destinationLabel={destinationLabel} />
        </View>
    );
}

function Arrival({ legs, destinationLabel }: TransitStepsProps) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TimeLabel iso={legs[legs.length - 1].arrival} />
            <Rail color={colors.primary} walk={false} last />
            <FullName text={destinationLabel} weight="semibold" fill />
        </View>
    );
}
