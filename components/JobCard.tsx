import { Briefcase, CheckCircle2, Circle, MapPin } from 'lucide-react-native';
import { View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import type { Job } from '../interfaces/job.d';
import { useTheme } from '../lib/theme-context';
import { ThemedText } from './ui/ThemedText';
import { PressableScale } from './ui/PressableScale';
import { jobName, jobRole } from '../lib/jobLabels';

interface JobCardProps {
    job: Job;
    onPress?: () => void;
    onLongPress?: () => void;
    selectionMode?: boolean;
    selected?: boolean;
}

export function JobCard({ job, onPress, onLongPress, selectionMode, selected }: JobCardProps) {
    const { colors } = useTheme();

    return (
        <PressableScale
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={300}
            accessibilityRole="button"
            style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: job.color, opacity: selectionMode && !selected ? 0.6 : 1 }} pressedScale={onPress ? 0.98 : 1}
        >
            {selectionMode ? (
                <View style={{ marginRight: spacing.sm }}>
                    {selected ? <CheckCircle2 color={colors.primary} size={22} /> : <Circle color={colors.textMuted} size={22} />}
                </View>
            ) : (
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.sm,
                        backgroundColor: job.color + '33',
                    }}
                >
                    <Briefcase color={job.color} size={20} />
                </View>
            )}

            <View style={{ flex: 1 }}>
                <ThemedText weight="semibold">{jobName(job)}</ThemedText>
                {!!jobRole(job) && <ThemedText variant="secondary" size="sm">{jobRole(job)}</ThemedText>}
                {job.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MapPin color={colors.textMuted} size={12} />
                        <ThemedText variant="muted" size="xs" style={{ marginLeft: 4 }}>{job.location}</ThemedText>
                    </View>
                )}
            </View>
        </PressableScale>
    );
}