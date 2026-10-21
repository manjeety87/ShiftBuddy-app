import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ThemedText } from '../components/ui/ThemedText';
import { spacing } from '../constants/themes';
import { updateProfile } from '../lib/auth';
import { useAuth } from '../lib/auth-context';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { ThemedInput } from '../components/ui/ThemedInput';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

export default function TaxSettingsScreen() {
    const { user, refreshUser } = useAuth();
    const [taxPercent, setTaxPercent] = useState(user?.taxDeductionPercent?.toString() || '13');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const value = parseFloat(taxPercent);
        if (isNaN(value) || value < 0 || value > 100) { showAlert('Invalid value', 'Please enter a number between 0 and 100.'); return; }
        setIsSaving(true);
        try {
            const updatedUser = await updateProfile({ taxDeductionPercent: value });
            refreshUser(updatedUser);
            router.back();
        } catch {
            showAlert('Error', 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardSafeView>
            <SheetHeader title="Tax Deduction" onCancel={() => router.back()} onSave={handleSave} isSaving={isSaving} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <ThemedText variant="muted" size="sm" style={{ marginBottom: spacing.xl, lineHeight: 20 }}>
                    We use this percentage to estimate your take-home pay. This is only an estimate — actual
                    deductions depend on your total income, province, and CRA rules, which we don’t calculate
                    exactly. Adjust this number to better match your real paycheck over time.
                </ThemedText>

                <ThemedText variant="secondary" size="sm" style={{ marginBottom: 4 }}>Deduction Percentage</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
                    <ThemedInput value={taxPercent} onChangeText={setTaxPercent} keyboardType="decimal-pad" autoFocus style={{ flex: 1 }} />
                    <ThemedText variant="secondary" size="lg" weight="medium">%</ThemedText>
                </View>
            </ScrollView>
        </KeyboardSafeView>
    );
}