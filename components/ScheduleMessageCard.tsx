import { Share as ShareIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Share, Switch, View } from 'react-native';
import { radius, spacing } from '../constants/themes';
import { getScheduleMessage, type ScheduleNameStyle, type ScheduleRange } from '../lib/scheduleMessage';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';
import { ThemedText } from './ui/ThemedText';
import { SegmentedControl } from './ui/SegmentedControl';
import { showAlert } from '../lib/dialog';
import { Button } from './ui/Button';

const RANGES: { value: ScheduleRange; label: string }[] = [
    { value: 'thisWeek', label: 'This week' },
    { value: 'nextWeek', label: 'Next week' },
    { value: 'thisMonth', label: 'This month' },
];

const NAME_STYLES: { value: ScheduleNameStyle; label: string }[] = [
    { value: 'workplace', label: 'Workplace' },
    { value: 'job', label: 'Job title' },
];

/** Build a plain-text schedule ("Mon, Oct 5: 9 AM – 5 PM Boathouse …") and send it through WhatsApp, SMS, etc. */
export function ScheduleMessageCard() {
    const { colors } = useTheme();
    const [range, setRange] = useState<ScheduleRange>('thisWeek');
    const [nameStyle, setNameStyle] = useState<ScheduleNameStyle>('workplace');
    const [includeDaysOff, setIncludeDaysOff] = useState(true);

    const preview = useFetch(() => getScheduleMessage({ range, nameStyle, includeDaysOff }), [range, nameStyle, includeDaysOff]);
    const message = preview.data?.message ?? '';

    const handleShare = async () => {
        try {
            await Share.share({ message });
        } catch {
            showAlert('Couldn’t open sharing', 'Please try again.');
        }
    };

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md }}>
            <SegmentedControl options={RANGES} value={range} onChange={setRange} accessibilityLabel="Which dates" />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <ThemedText variant="secondary" size="sm" style={{ width: 70 }}>Name by</ThemedText>
                <View style={{ flex: 1 }}><SegmentedControl options={NAME_STYLES} value={nameStyle} onChange={setNameStyle} size="sm" accessibilityLabel="Name shifts by" /></View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText variant="secondary" size="sm" style={{ flex: 1 }}>Show days off</ThemedText>
                <Switch value={includeDaysOff} onValueChange={setIncludeDaysOff} trackColor={{ true: colors.primary }} />
            </View>

            {/* What will be sent, exactly */}
            <View style={{ backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, minHeight: 80, justifyContent: 'center' }}>
                {preview.isLoading && !preview.data ? (
                    <ActivityIndicator color={colors.primary} />
                ) : preview.error && !preview.data ? (
                    <ThemedText variant="secondary" size="sm">Couldn’t build the message. Check your connection and try again.</ThemedText>
                ) : (
                    <ThemedText size="sm" style={{ lineHeight: 21, fontVariant: ['tabular-nums'] }} selectable>{message}</ThemedText>
                )}
            </View>

            <Button label="Share…" icon={ShareIcon} onPress={handleShare} disabled={!message} />
        </View>
    );
}
