import { router } from 'expo-router';
import { CalendarPlus, Plus, ScanLine } from 'lucide-react-native';
import { View } from 'react-native';
import { spacing } from '../constants/themes';
import { withAlpha } from '../lib/color';
import { useTheme } from '../lib/theme-context';
import { Button } from './ui/Button';
import { ThemedText } from './ui/ThemedText';

/**
 * Sits where the upcoming-shift card will be once there is a shift: says there's
 * nothing yet and offers the two ways to change that. `isFirstTime` = no shifts
 * around at all (a new account); otherwise the schedule has simply run out.
 */
export function NoShiftsCard({ isFirstTime }: { isFirstTime: boolean }) {
    const { colors } = useTheme();

    return (
        <View style={{ borderRadius: 24, padding: spacing.lg, marginBottom: spacing.lg, backgroundColor: colors.surface, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, backgroundColor: withAlpha(colors.primary, 0.12) }}>
                <CalendarPlus color={colors.primary} size={26} />
            </View>
            <ThemedText size="lg" weight="bold" style={{ textAlign: 'center', marginBottom: 4 }}>
                {isFirstTime ? 'No shifts added yet' : 'No upcoming shifts'}
            </ThemedText>
            <ThemedText variant="secondary" size="sm" style={{ textAlign: 'center', marginBottom: spacing.lg }}>
                {isFirstTime
                    ? 'Add your first shift and it shows up here — with a countdown and when to leave.'
                    : 'Add your next shifts and the next one shows up here.'}
            </ThemedText>
            <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
                <Button label="Add a Shift" icon={Plus} onPress={() => router.push('/create-shift')} />
                <Button label="Scan a Schedule Photo" icon={ScanLine} variant="tinted" onPress={() => router.push('/import-schedule')} />
            </View>
            <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.sm }}>
                Type it in, or take a photo of the schedule at work.
            </ThemedText>
        </View>
    );
}
