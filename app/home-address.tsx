import { router } from 'expo-router';
import { House, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LocationPicker } from '../components/LocationPicker';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { CommuteMode, Place } from '../interfaces/user.d';
import { removeHomeLocation, setHomeLocation, updateProfile } from '../lib/auth';
import { ARRIVAL_BUFFER_MAX_MINUTES, ARRIVAL_BUFFER_OPTIONS, arrivalBufferChoice, describeArrivalBuffer, describeArriveByExample, type ArrivalBufferChoice } from '../lib/commute';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { Button, TextButton } from '../components/ui/Button';
import { ThemedInput } from '../components/ui/ThemedInput';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

export default function HomeAddressScreen() {
    const { colors } = useTheme();
    const { user, refreshUser } = useAuth();
    const home = user?.homeLocation ?? null;

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
    // Shown immediately on tap; rolled back if saving fails
    const [commuteMode, setCommuteMode] = useState<CommuteMode>(user?.commuteMode ?? 'TRANSIT');
    const [arrivalBuffer, setArrivalBuffer] = useState(user?.arrivalBufferMinutes ?? 10);
    // Custom stays picked while its minutes are typed — they save only on Set, never mid-typing
    const [isCustom, setIsCustom] = useState(arrivalBufferChoice(arrivalBuffer) === 'custom');
    const [customMinutes, setCustomMinutes] = useState(isCustom ? String(arrivalBuffer) : '');

    const saveBuffer = async (minutes: number) => {
        if (minutes === arrivalBuffer) return;
        const previous = arrivalBuffer;
        setArrivalBuffer(minutes);
        try {
            refreshUser(await updateProfile({ arrivalBufferMinutes: minutes }));
        } catch (err: any) {
            setArrivalBuffer(previous);
            showAlert('Could not save', err?.response?.data?.message || 'Please try again.');
        }
    };

    const handleBufferChange = (choice: ArrivalBufferChoice) => {
        setIsCustom(choice === 'custom');
        if (choice !== 'custom') saveBuffer(Number(choice));
    };

    const customValue = Number(customMinutes);
    const isCustomValid = /^\d+$/.test(customMinutes) && customValue <= ARRIVAL_BUFFER_MAX_MINUTES;
    const canSetCustom = isCustomValid && customValue !== arrivalBuffer;

    const handleCommuteChange = async (mode: CommuteMode) => {
        if (mode === commuteMode) return;
        const previous = commuteMode;
        setCommuteMode(mode);
        try {
            refreshUser(await updateProfile({ commuteMode: mode }));
        } catch (err: any) {
            setCommuteMode(previous);
            showAlert('Could not save', err?.response?.data?.message || 'Please try again.');
        }
    };

    const handleSave = async (place: Place) => {
        setBusy('save');
        try {
            refreshUser(await setHomeLocation(place));
        } catch (err: any) {
            showAlert('Could not save your home address', err?.response?.data?.message || 'Please try again.');
        } finally {
            setBusy(null);
        }
    };

    const handleRemove = () => {
        showAlert('Remove home address?', 'Route planning will use your current location instead.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    setBusy('remove');
                    try {
                        refreshUser(await removeHomeLocation());
                    } catch (err: any) {
                        showAlert('Could not remove your home address', err?.response?.data?.message || 'Please try again.');
                    } finally {
                        setBusy(null);
                    }
                },
            },
        ]);
    };


    return (
        <KeyboardSafeView>
            <SheetHeader title="Home & Commute" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingTop: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>GETTING AROUND</ThemedText>
                <SegmentedControl
                    options={[{ value: 'TRANSIT', label: 'Transit' }, { value: 'DRIVING', label: 'Driving' }]}
                    value={commuteMode}
                    onChange={handleCommuteChange}
                    accessibilityLabel="How you get around"
                />
                <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginBottom: spacing.xl, lineHeight: 16 }}>
                    We use this to warn you when you can’t get from one job to the next in time.
                </ThemedText>

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 8, marginLeft: 4 }}>ARRIVE BEFORE YOUR SHIFT</ThemedText>
                <SegmentedControl
                    options={[...ARRIVAL_BUFFER_OPTIONS]}
                    value={isCustom ? 'custom' : arrivalBufferChoice(arrivalBuffer)}
                    onChange={handleBufferChange}
                    accessibilityLabel="How early to arrive"
                />
                {isCustom && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                        <ThemedInput
                            value={customMinutes}
                            onChangeText={(text) => setCustomMinutes(text.replace(/[^0-9]/g, ''))}
                            onSubmitEditing={() => isCustomValid && saveBuffer(customValue)}
                            keyboardType="number-pad"
                            returnKeyType="done"
                            maxLength={3}
                            placeholder="7"
                            accessibilityLabel="Minutes early"
                            autoFocus={customMinutes === ''}
                            style={{ width: 72, textAlign: 'right' }}
                        />
                        <ThemedText variant="secondary" style={{ flex: 1 }}>min early</ThemedText>
                        {/* TextButton doesn't dim itself when disabled */}
                        <TextButton label="Set" onPress={() => saveBuffer(customValue)} disabled={!canSetCustom} style={{ opacity: canSetCustom ? 1 : 0.45 }} />
                    </View>
                )}
                <ThemedText variant="muted" size="xs" style={{ marginTop: 6, marginBottom: spacing.xl, lineHeight: 16 }}>
                    {isCustom && customMinutes !== '' && !isCustomValid
                        ? `Up to ${ARRIVAL_BUFFER_MAX_MINUTES} minutes.`
                        : <>
                            Leave-by times and routes are planned so you {describeArrivalBuffer(arrivalBuffer)}
                            {arrivalBuffer === 0 ? ' — no room for a late bus.' : ` — ${describeArriveByExample(arrivalBuffer)}`}
                        </>}
                </ThemedText>

                <ThemedText variant="secondary" size="sm" weight="medium" style={{ marginBottom: 4, marginLeft: 4 }}>HOME ADDRESS</ThemedText>
                <ThemedText variant="muted" size="xs" style={{ marginBottom: spacing.md, lineHeight: 16 }}>
                    Used to work out when to leave home for a shift and when you’ll be back. Only visible to you.
                </ThemedText>

                {home ? (
                    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', gap: spacing.sm }}>
                        <MapPin color={colors.primary} size={20} style={{ marginTop: 2 }} />
                        <ThemedText style={{ flex: 1, lineHeight: 22 }}>{home.address}</ThemedText>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                        <House color={colors.textMuted} size={40} />
                        <ThemedText variant="muted" style={{ marginTop: spacing.sm, textAlign: 'center' }}>No home address yet</ThemedText>
                    </View>
                )}

                <Button
                    label={home ? 'Change Address' : 'Set Home Address'}
                    onPress={() => setIsPickerOpen(true)}
                    isLoading={busy === 'save'}
                    disabled={busy !== null}
                    variant={home ? 'tinted' : 'primary'}
                    style={{ marginBottom: spacing.sm }}
                />

                {home && <Button label="Remove Address" variant="danger" onPress={handleRemove} isLoading={busy === 'remove'} disabled={busy !== null} />}

                <LocationPicker
                    visible={isPickerOpen}
                    onClose={() => setIsPickerOpen(false)}
                    onConfirm={handleSave}
                    initial={home}
                    title="Where do you live?"
                />
            </ScrollView>
        </KeyboardSafeView>
    );
}
