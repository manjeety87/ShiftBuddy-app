import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ThemedText } from '../components/ui/ThemedText';
import { spacing } from '../constants/themes';
import { updateProfile } from '../lib/auth';
import { useAuth } from '../lib/auth-context';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { ThemedInput } from '../components/ui/ThemedInput';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

export default function EditProfileScreen() {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { showAlert('Missing info', 'Please enter your name.'); return; }
        setIsSaving(true);
        try {
            const updatedUser = await updateProfile({ name: name.trim() });
            refreshUser(updatedUser);
            router.back();
        } catch (err: any) {
            showAlert('Could not update profile', err?.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardSafeView>
            <SheetHeader title="Edit Profile" onCancel={() => router.back()} onSave={handleSave} isSaving={isSaving} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <ThemedText variant="secondary" size="sm" style={{ marginBottom: 4 }}>Full Name</ThemedText>
                <ThemedInput value={name} onChangeText={setName} autoComplete="name" textContentType="name" autoCapitalize="words" style={{ marginBottom: 8 }} />

                <ThemedText variant="muted" size="sm" style={{ marginBottom: 8 }}>{user?.email}</ThemedText>
                <ThemedText variant="muted" size="xs" style={{ marginBottom: spacing.xl }}>Email cannot be changed at this time.</ThemedText>
            </ScrollView>
        </KeyboardSafeView>
    );
}