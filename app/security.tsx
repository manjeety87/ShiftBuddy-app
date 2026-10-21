import { router } from 'expo-router';
import { HelpCircle, Laptop, Lock, Smartphone, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { TextButton } from '../components/ui/Button';
import { ListRow } from '../components/ui/ListRow';
import { LoadError } from '../components/ui/LoadError';
import { SheetHeader } from '../components/ui/SheetHeader';
import { ThemedText } from '../components/ui/ThemedText';
import { radius, spacing } from '../constants/themes';
import type { SignedInDevice } from '../interfaces/account.d';
import { getSignedInDevices, signOutDevice, signOutOtherDevices } from '../lib/account';
import { useAuth } from '../lib/auth-context';
import { withAlpha } from '../lib/color';
import { showAlert } from '../lib/dialog';
import { notify } from '../lib/notify';
import { useTheme } from '../lib/theme-context';
import { useFetch } from '../lib/useFetch';

const ICONS: Record<SignedInDevice['device']['kind'], LucideIcon> = { browser: Laptop, app: Smartphone, unknown: HelpCircle };

const MINUTE_MS = 60 * 1000;

/** "Active now", "Active 3h ago", "Active 2d ago" */
const activeLabel = (iso: string) => {
    const minutes = Math.round((Date.now() - Date.parse(iso)) / MINUTE_MS);
    if (minutes < 5) return 'Active now';
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    return `Active ${Math.round(hours / 24)}d ago`;
};
const signedInLabel = (iso: string) => `Signed in ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

const errorText = (err: any) => err?.response?.data?.message;

/**
 * How you sign in, and every phone and browser signed in to the account now.
 * Another device signs out with one tap (they just log in again there); all of
 * them at once asks first.
 */
export default function SecurityScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const devices = useFetch(getSignedInDevices);
    const [busy, setBusy] = useState<string | null>(null);

    const others = devices.data?.filter((device) => !device.isCurrent) ?? [];

    const signOutOne = async (device: SignedInDevice) => {
        setBusy(device.id);
        try {
            await signOutDevice(device.id);
            notify.success(`Signed out of ${device.device.name}`);
        } catch (err) {
            notify.error('Couldn’t sign that device out', { description: errorText(err) });
        } finally {
            await devices.refetch();
            setBusy(null);
        }
    };

    const signOutOthers = () =>
        showAlert(`Sign out of ${others.length === 1 ? '1 other device' : `${others.length} other devices`}?`, 'You stay signed in here. Anyone using ShiftBuddy on them will need to log in again.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    setBusy('others');
                    try {
                        const count = await signOutOtherDevices();
                        notify.success(count === 1 ? 'Signed out of 1 other device' : `Signed out of ${count} other devices`);
                    } catch (err) {
                        notify.error('Couldn’t sign the other devices out', { description: errorText(err) });
                    } finally {
                        await devices.refetch();
                        setBusy(null);
                    }
                },
            },
        ]);

    const card = { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' as const };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <SheetHeader title="Password & Security" onCancel={() => router.back()} onSave={() => router.back()} saveLabel="Done" hideCancel />
            <ScrollView
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
                refreshControl={<RefreshControl refreshing={devices.isRefreshing} onRefresh={devices.refresh} tintColor={colors.primary} />}
            >
                <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>SIGN-IN</ThemedText>
                <View style={{ ...card, marginBottom: spacing.lg }}>
                    {!user ? null : user.hasPassword ? (
                        <ListRow icon={Lock} label="Change Password" onPress={() => router.push('/change-password')} isFirst />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                            <Lock color={colors.textSecondary} size={20} />
                            <ThemedText variant="secondary" style={{ flex: 1 }}>
                                You sign in with {user.signInMethods?.apple && !user.signInMethods.google ? 'Apple' : 'Google'}, so there’s no password to manage.
                            </ThemedText>
                        </View>
                    )}
                </View>

                <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: 4, marginLeft: 4 }}>WHERE YOU’RE SIGNED IN</ThemedText>
                <ThemedText variant="muted" size="xs" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>Phones and browsers with ShiftBuddy open on your account.</ThemedText>

                {devices.isLoading && !devices.data ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
                ) : devices.error && !devices.data ? (
                    <LoadError message="Couldn’t load where you’re signed in." onRetry={devices.refresh} />
                ) : (
                    <>
                        <View style={card}>
                            {devices.data?.map((device, index) => {
                                const Icon = ICONS[device.device.kind];
                                return (
                                    <View key={device.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceLight }}>
                                            <Icon color={colors.textSecondary} size={18} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <ThemedText weight="medium" numberOfLines={1}>{device.device.name}</ThemedText>
                                                {device.isCurrent && (
                                                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: withAlpha(colors.primary, 0.14) }}>
                                                        <ThemedText size="xs" weight="semibold" color={colors.primary}>This device</ThemedText>
                                                    </View>
                                                )}
                                            </View>
                                            <ThemedText variant="secondary" size="xs">
                                                {device.isCurrent ? 'Active now' : activeLabel(device.lastUsedAt)} · {signedInLabel(device.createdAt)}
                                            </ThemedText>
                                        </View>
                                        {!device.isCurrent &&
                                            (busy === device.id ? (
                                                <ActivityIndicator color={colors.primary} />
                                            ) : (
                                                <TextButton label="Sign out" size="sm" onPress={() => signOutOne(device)} disabled={busy !== null} />
                                            ))}
                                    </View>
                                );
                            })}
                        </View>
                        {others.length > 0 ? (
                            <View style={{ alignItems: 'center', marginTop: spacing.md, gap: 4 }}>
                                <ThemedText variant="muted" size="xs">Don’t recognise one, or left yourself signed in somewhere?</ThemedText>
                                {busy === 'others' ? (
                                    <ActivityIndicator color={colors.danger} />
                                ) : (
                                    <TextButton label="Sign out of all others" color={colors.danger} size="sm" onPress={signOutOthers} disabled={busy !== null} />
                                )}
                            </View>
                        ) : (
                            <ThemedText variant="muted" size="xs" style={{ marginTop: spacing.sm, marginLeft: 4 }}>You’re only signed in here.</ThemedText>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}
