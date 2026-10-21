import { SaveFormat, useImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImageIcon, RotateCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, View } from 'react-native';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import { useAuth } from '../lib/auth-context';
import { extractShiftsFromImage } from '../lib/ocr';
import { useTheme } from '../lib/theme-context';
import { SheetHeader } from '../components/ui/SheetHeader';
import { showAlert } from '../lib/dialog';
import { Button, IconButton } from '../components/ui/Button';
import { ThemedInput } from '../components/ui/ThemedInput';
import { KeyboardSafeView } from '../components/ui/KeyboardSafeView';

export default function ImportScheduleScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [employeeName, setEmployeeName] = useState(user?.name || '');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);

    const context = useImageManipulator(selectedImage || '');

    const pickImage = async (source: 'camera' | 'gallery') => {
        const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            const what = source === 'camera' ? 'camera' : 'photos';
            showAlert(`Allow ${what} access`, `ShiftBuddy needs your ${what} to read your schedule. You can turn it on in Settings.`, [
                { text: 'Not Now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]);
            return;
        }
        const result = source === 'camera' ? await ImagePicker.launchCameraAsync({ quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        if (!result.canceled && result.assets[0]) setSelectedImage(result.assets[0].uri);
    };

    const handleRotate = async () => {
        if (!selectedImage) return;
        setIsRotating(true);
        try {
            context.rotate(90);
            const rendered = await context.renderAsync();
            const result = await rendered.saveAsync({ format: SaveFormat.JPEG });
            setSelectedImage(result.uri);
        } catch {
            showAlert('Error', 'Could not rotate the image.');
        } finally {
            setIsRotating(false);
        }
    };

    const handleExtract = async () => {
        if (!selectedImage) return;
        setIsProcessing(true);
        try {
            const shifts = await extractShiftsFromImage(selectedImage, employeeName.trim());
            if (shifts.length === 0) {
                showAlert('No shifts found', `Could not find any shifts for "${employeeName}" in this image. Try a clearer or correctly-rotated photo.`);
                return;
            }
            router.push({ pathname: '/review-shifts', params: { shifts: JSON.stringify(shifts) } });
        } catch (err: any) {
            showAlert('Extraction failed', err?.response?.data?.message || 'Something went wrong while processing the image.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <KeyboardSafeView>
            <SheetHeader title="Scan Schedule" onCancel={() => router.back()} />
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <ThemedText variant="muted" style={{ marginBottom: spacing.lg }}>
                    Take a photo or upload a screenshot of your work schedule
                </ThemedText>

                {selectedImage ? (
                    <View style={{ marginBottom: spacing.md }}>
                        <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 288, borderRadius: radius.lg }} resizeMode="contain" />
                        {isRotating ? (
                            <ActivityIndicator color="#FFFFFF" style={{ position: 'absolute', top: 22, right: 22 }} />
                        ) : (
                            <IconButton
                                icon={RotateCw}
                                accessibilityLabel="Rotate photo"
                                onPress={handleRotate}
                                color="#FFFFFF"
                                size={40}
                                style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)' }}
                            />
                        )}
                    </View>
                ) : (
                    <View style={{ width: '100%', height: 288, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
                        <ImageIcon color={colors.textMuted} size={48} />
                        <ThemedText variant="muted" style={{ marginTop: 12 }}>No image selected</ThemedText>
                    </View>
                )}

                {selectedImage && (
                    <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginBottom: spacing.md }}>
                        Photo sideways or upside down? Tap the rotate icon to fix it.
                    </ThemedText>
                )}

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
                    <Button label="Camera" icon={Camera} variant="secondary" onPress={() => pickImage('camera')} style={{ flex: 1 }} />
                    <Button label="Photos" icon={ImageIcon} variant="secondary" onPress={() => pickImage('gallery')} style={{ flex: 1 }} />
                </View>

                <ThemedText variant="secondary" size="sm" style={{ marginBottom: 4 }}>Your name (as it appears on the schedule)</ThemedText>
                <ThemedInput value={employeeName} onChangeText={setEmployeeName} autoCapitalize="words" style={{ marginBottom: spacing.lg }} />

                <Button label="Read Shifts" onPress={handleExtract} isLoading={isProcessing} disabled={!selectedImage || !employeeName.trim()} />
                {isProcessing && (
                    <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.sm }}>Reading your schedule — this takes a few seconds…</ThemedText>
                )}
            </ScrollView>
        </KeyboardSafeView>
    );
}