import { router } from 'expo-router';
import { AlertTriangle, ChevronRight, Clock3, Layers } from 'lucide-react-native';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import type { ShiftConflict } from '../lib/conflicts';
import { formatDate, formatTime } from '../lib/dateUtils';
import { useTheme } from '../lib/theme-context';
import { commuteLabel, type TravelConflict } from '../lib/travelConflicts';
import { ThemedText } from './ui/ThemedText';
import { PressableScale } from './ui/PressableScale';
import Animated from 'react-native-reanimated';
import { motion } from '../lib/motion';
import { jobName } from '../lib/jobLabels';

const MAX_VISIBLE = 3;

interface Issue {
    key: string;
    kind: 'overlap' | 'late' | 'tight';
    /** Opens the issue's own screen, which explains it and offers fixes */
    href: string;
    sortTime: number;
    title: string;
    detail: string;
}

const fromOverlap = ({ first, second }: ShiftConflict): Issue => ({
    key: `overlap-${first.id}-${second.id}`,
    kind: 'overlap',
    href: `/conflict?kind=overlap&from=${first.id}&to=${second.id}`,
    sortTime: Date.parse(second.startTime),
    title: `${formatDate(second.startTime)} · shifts overlap`,
    detail: `${jobName(first.job)} ${formatTime(first.startTime)}–${formatTime(first.endTime)} and ${jobName(second.job)} ${formatTime(second.startTime)}–${formatTime(second.endTime)}`,
});

const fromTravel = (conflict: TravelConflict): Issue => {
    const { fromShift, toShift } = conflict;
    const late = conflict.severity === 'late';
    return {
        key: `travel-${fromShift.id}-${toShift.id}`,
        kind: conflict.severity,
        href: `/conflict?kind=travel&from=${fromShift.id}&to=${toShift.id}`,
        sortTime: Date.parse(toShift.startTime),
        title: late
            ? `${formatDate(toShift.startTime)} · ~${conflict.lateByMinutes} min late to ${jobName(toShift.job)}`
            : `${formatDate(toShift.startTime)} · tight trip to ${jobName(toShift.job)}`,
        detail: `${jobName(fromShift.job)} ends ${formatTime(fromShift.endTime)} · ${conflict.travelMinutes} min by ${commuteLabel(conflict.mode)} · starts ${formatTime(toShift.startTime)}`,
    };
};

interface ConflictBannerProps {
    overlaps: ShiftConflict[];
    travel: TravelConflict[];
}

/** Upcoming schedule problems — overlapping shifts and trips between jobs that don't fit. */
export function ConflictBanner({ overlaps, travel }: ConflictBannerProps) {
    const { colors } = useTheme();
    const issues = [...overlaps.map(fromOverlap), ...travel.map(fromTravel)].sort((a, b) => a.sortTime - b.sortTime);
    if (issues.length === 0) return null;

    const hidden = issues.length - MAX_VISIBLE;
    const hasSerious = issues.some((issue) => issue.kind !== 'tight');
    const tone = hasSerious ? colors.danger : colors.warning;

    return (
        <Animated.View
            entering={motion.appear}
            exiting={motion.disappear}
            layout={motion.layout}
            style={{
                backgroundColor: withAlpha(tone, 0.1),
                borderColor: withAlpha(tone, 0.3),
                borderWidth: 1,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.lg,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
                <AlertTriangle color={tone} size={18} />
                <ThemedText weight="semibold">
                    {issues.length === 1 ? '1 schedule issue' : `${issues.length} schedule issues`}
                </ThemedText>
            </View>

            {issues.slice(0, MAX_VISIBLE).map((issue) => {
                const Icon = issue.kind === 'overlap' ? Layers : Clock3;
                const iconColor = issue.kind === 'tight' ? colors.warning : colors.danger;
                return (
                    <PressableScale
                        key={issue.key}
                        onPress={() => router.push(issue.href as never)}
                        accessibilityRole="button"
                        accessibilityHint="Explains the problem and how to fix it"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }} pressedScale={0.98}
                    >
                        <Icon color={iconColor} size={16} />
                        <View style={{ flex: 1 }}>
                            <ThemedText size="sm" weight="medium">{issue.title}</ThemedText>
                            <ThemedText variant="secondary" size="xs" numberOfLines={2}>{issue.detail}</ThemedText>
                        </View>
                        <ChevronRight color={colors.textMuted} size={18} />
                    </PressableScale>
                );
            })}

            {hidden > 0 && (
                <ThemedText variant="muted" size="xs" style={{ marginTop: 4 }}>
                    +{hidden} more
                </ThemedText>
            )}
        </Animated.View>
    );
}
