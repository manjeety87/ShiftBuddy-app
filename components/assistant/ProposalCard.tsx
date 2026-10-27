import { TriangleAlert } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '../../constants/themes';
import type { Proposal } from '../../lib/assistant';
import { formatDate, formatTime } from '../../lib/dateUtils';
import { MISSED_REASONS } from '../../lib/missedShifts';
import { motion } from '../../lib/motion';
import { formatDuration } from '../../lib/shiftTime';
import { useTheme } from '../../lib/theme-context';
import { Button, TextButton } from '../ui/Button';
import { ThemedText } from '../ui/ThemedText';

const minutesBetween = (start: string, end: string) => Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);

/** The button says what will happen, and the reply after it uses the same verb */
export const saveLabel = (proposal: Proposal) => {
    if (proposal.type === 'addShifts') return proposal.shifts.length === 1 ? 'Add Shift' : `Add ${proposal.shifts.length} Shifts`;
    return proposal.type === 'markMissed' ? 'Mark Missed' : 'Add Hours';
};

function ShiftLine({ jobName, role, color, startTime, endTime, detail }: { jobName: string; role: string | null; color: string; startTime: string; endTime: string; detail?: string }) {
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm + 4, paddingVertical: 6 }}>
            <View style={{ width: 4, borderRadius: 2, backgroundColor: color }} />
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <ThemedText weight="semibold">{formatDate(startTime)}</ThemedText>
                    <ThemedText variant="secondary" size="sm">{formatDuration(minutesBetween(startTime, endTime))}</ThemedText>
                </View>
                <ThemedText>{formatTime(startTime)} – {formatTime(endTime)}</ThemedText>
                <ThemedText variant="secondary" size="sm" numberOfLines={1}>
                    {jobName}
                    {role ? ` · ${role}` : ''}
                    {detail ? ` · ${detail}` : ''}
                </ThemedText>
            </View>
        </View>
    );
}

/**
 * What the assistant offers to save, before anything is saved: the person reads it
 * and says yes (or taps the button). It sits right above the microphone, where the
 * answer comes from.
 */
export function ProposalCard({ proposal, busy, listening, onSave, onDismiss }: { proposal: Proposal; busy: boolean; listening: boolean; onSave: () => void; onDismiss: () => void }) {
    const { colors } = useTheme();
    const title = proposal.type === 'addShifts' ? (proposal.shifts.length === 1 ? 'New shift' : `${proposal.shifts.length} new shifts`) : proposal.type === 'markMissed' ? 'Mark as missed' : 'Hours worked';

    return (
        <Animated.View entering={motion.appear} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }} accessibilityLabel={title}>
            <ThemedText variant="secondary" size="sm" weight="medium">
                {title}
            </ThemedText>

            {proposal.type === 'addShifts' && (
                <>
                    <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
                        {proposal.preview.shifts.map((shift) => (
                            <ShiftLine key={shift.startTime} {...shift} detail={shift.notes ?? undefined} />
                        ))}
                    </ScrollView>
                    {proposal.preview.overlaps.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.warning + '22', borderRadius: radius.sm, padding: spacing.sm }}>
                            <TriangleAlert color={colors.warning} size={16} />
                            <ThemedText size="sm" style={{ flex: 1 }}>
                                {proposal.shifts.length === 1
                                    ? `Overlaps ${proposal.preview.overlaps.map((shift) => `${shift.jobName}, ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`).join(' and ')}. Saving keeps both.`
                                    : 'Some of these clash with shifts you already have; those are skipped.'}
                            </ThemedText>
                        </View>
                    )}
                </>
            )}

            {proposal.type === 'markMissed' && <ShiftLine {...proposal.preview} detail={MISSED_REASONS.find((option) => option.value === proposal.reason)?.short} />}

            {proposal.type === 'logHours' && (
                <ShiftLine
                    {...proposal.preview}
                    startTime={proposal.preview.clockIn}
                    endTime={proposal.preview.clockOut}
                    detail={`${proposal.preview.breakMinutes ? `${proposal.preview.breakMinutes} min break · ` : ''}${formatDuration(proposal.preview.paidMinutes)} paid`}
                />
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs }}>
                {/* Only while the microphone is on — never promise what won't work */}
                <ThemedText variant="secondary" size="sm" style={{ flex: 1 }}>
                    {listening ? 'Say “yes”, or' : ''}
                </ThemedText>
                <TextButton label="Not Now" color={colors.textSecondary} weight="medium" onPress={onDismiss} disabled={busy} />
                <Button label={saveLabel(proposal)} onPress={onSave} isLoading={busy} style={{ paddingHorizontal: spacing.md }} />
            </View>
        </Animated.View>
    );
}
