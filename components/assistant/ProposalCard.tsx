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
    if (proposal.type === 'editShift') return 'Change Shift';
    if (proposal.type === 'removeShifts') return proposal.shiftIds.length === 1 ? 'Remove Shift' : `Remove ${proposal.shiftIds.length} Shifts`;
    return proposal.type === 'markMissed' ? 'Mark Missed' : 'Add Hours';
};

// The line a change replaces, or a shift about to go: struck through
const STRUCK = { textDecorationLine: 'line-through' } as const;

function ShiftLine({ jobName, role, color, startTime, endTime, detail, muted }: { jobName: string; role: string | null; color: string; startTime: string; endTime: string; detail?: string; muted?: boolean }) {
    const struck = muted ? STRUCK : undefined;
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm + 4, paddingVertical: 6 }}>
            <View style={{ width: 4, borderRadius: 2, backgroundColor: color, opacity: muted ? 0.45 : 1 }} />
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                    <ThemedText weight="semibold" variant={muted ? 'secondary' : undefined} style={struck}>
                        {formatDate(startTime)}
                    </ThemedText>
                    <ThemedText variant="secondary" size="sm" style={struck}>
                        {formatDuration(minutesBetween(startTime, endTime))}
                    </ThemedText>
                </View>
                <ThemedText variant={muted ? 'secondary' : undefined} style={struck}>
                    {formatTime(startTime)} – {formatTime(endTime)}
                </ThemedText>
                <ThemedText variant="secondary" size="sm" numberOfLines={1}>
                    {jobName}
                    {role ? ` · ${role}` : ''}
                    {detail ? ` · ${detail}` : ''}
                </ThemedText>
            </View>
        </View>
    );
}

const TITLES: { [Type in Proposal['type']]: (proposal: Proposal) => string } = {
    addShifts: (proposal) => (proposal.type === 'addShifts' && proposal.shifts.length > 1 ? `${proposal.shifts.length} new shifts` : 'New shift'),
    editShift: () => 'Change shift',
    removeShifts: (proposal) => (proposal.type === 'removeShifts' && proposal.shiftIds.length > 1 ? `Remove ${proposal.shiftIds.length} shifts` : 'Remove from schedule'),
    markMissed: () => 'Mark as missed',
    logHours: () => 'Hours worked',
};

const clashText = (overlaps: { jobName: string; startTime: string; endTime: string }[]) =>
    `Overlaps ${overlaps.map((shift) => `${shift.jobName}, ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`).join(' and ')}.`;

function Clash({ text }: { text: string }) {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.warning + '22', borderRadius: radius.sm, padding: spacing.sm }}>
            <TriangleAlert color={colors.warning} size={16} />
            <ThemedText size="sm" style={{ flex: 1 }}>
                {text}
            </ThemedText>
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
    const title = TITLES[proposal.type](proposal);

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
                        <Clash text={proposal.shifts.length === 1 ? `${clashText(proposal.preview.overlaps)} Saving keeps both.` : 'Some of these clash with shifts you already have; those are skipped.'} />
                    )}
                </>
            )}

            {proposal.type === 'editShift' && (
                <>
                    {/* Was → will be: the old line struck through, so the change reads at a glance */}
                    <ShiftLine {...proposal.preview.before} detail="Now" muted />
                    <ShiftLine {...proposal.preview.after} detail="Changes to" />
                    {proposal.preview.overlaps.length > 0 && <Clash text={`${clashText(proposal.preview.overlaps)} Saving keeps both.`} />}
                </>
            )}

            {proposal.type === 'removeShifts' && (
                <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled>
                    {proposal.preview.shifts.map((shift) => (
                        <ShiftLine key={shift.startTime} {...shift} detail={shift.missed ? 'Missed' : undefined} muted />
                    ))}
                </ScrollView>
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
