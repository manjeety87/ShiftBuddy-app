import { router } from 'expo-router';
import { Bell, ClipboardList, DoorOpen, FolderDown, House, LogOut, MailWarning, Palette, Percent, ShieldCheck, SlidersHorizontal, User as UserIcon, Users, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { PressableScale } from '../../components/ui/PressableScale';
import { Screen, useScreenTopInset } from '../../components/ui/Screen';
import { ThemedText } from '../../components/ui/ThemedText';
import { radius, spacing } from '../../constants/themes';
import { withAlpha } from '../../lib/color';
import { useAuth } from '../../lib/auth-context';
import { notificationsSupported } from '../../lib/notifications';
import { useTheme } from '../../lib/theme-context';
import { showAlert } from '../../lib/dialog';
import { Button } from '../../components/ui/Button';
import { ListRow } from '../../components/ui/ListRow';
import { featuresOf } from '../../lib/features';

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const { colors } = useTheme();
    const topInset = useScreenTopInset();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        showAlert('Log out?', 'You will need to sign in again to access your shifts.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    setIsLoggingOut(true);
                    try { await logout(); }
                    catch { showAlert('Error', 'Something went wrong while logging out.'); }
                    finally { setIsLoggingOut(false); }
                },
            },
        ]);
    };

    const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

    const features = featuresOf(user);
    const menuItems = [
        // First: what the app can do is what people ask about most
        { icon: SlidersHorizontal, label: 'Features', onPress: () => router.push('/features') },
        { icon: UserIcon, label: 'Edit Profile', onPress: () => router.push('/edit-profile') },
        { icon: House, label: 'Home & Commute', onPress: () => router.push('/home-address') },
        ...(features.timesheet ? [{ icon: ClipboardList, label: 'Timesheet', onPress: () => router.push('/timesheet') }] : []),
        { icon: Users, label: 'Sharing', onPress: () => router.push('/sharing') },
        // Where notifications can't run (Android Expo Go) this lives under "Coming soon" instead
        ...(notificationsSupported ? [{ icon: Bell, label: 'Reminders & Alarms', onPress: () => router.push('/reminder-settings') }] : []),
        { icon: Palette, label: 'Appearance', onPress: () => router.push('/theme-settings') },
        ...(features.pay ? [{ icon: Percent, label: 'Tax Deduction (Estimate)', onPress: () => router.push('/tax-settings') }] : []),
        { icon: ShieldCheck, label: 'Password & Security', onPress: () => router.push('/security') },
        { icon: FolderDown, label: 'Your Data', onPress: () => router.push('/your-data') },
    ];

    // On the roadmap but not possible in this version yet — shown so people know they're coming
    const comingSoon: { icon: LucideIcon; label: string; description: string }[] = [
        ...(notificationsSupported ? [] : [{ icon: Bell, label: 'Reminders & alarms', description: 'A notification before each shift, and a wake-up alarm before the first one each day.' }]),
        { icon: DoorOpen, label: 'Leave-now alerts', description: 'A nudge when it’s time to leave, based on your commute.' },
    ];

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ paddingTop: topInset, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
                <ThemedText size="2xl" weight="bold" style={{ marginBottom: spacing.lg }}>Settings</ThemedText>

                {/* Profile card */}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                        <ThemedText color={colors.primary} size="lg" weight="bold">{initials}</ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                        <ThemedText size="lg" weight="semibold">{user?.name}</ThemedText>
                        <ThemedText variant="secondary" size="sm">{user?.email}</ThemedText>
                        {user && !user.isEmailVerified && (
                            <PressableScale
                                onPress={() => router.push('/verify-email')}
                                accessibilityRole="button"
                                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, backgroundColor: withAlpha(colors.warning, 0.15) }}
                            >
                                <MailWarning color={colors.warning} size={13} />
                                <ThemedText size="xs" weight="semibold" color={colors.warning}>Verify email</ThemedText>
                            </PressableScale>
                        )}
                    </View>
                </View>

                {/* Menu options */}
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' }}>
                    {menuItems.map((item, i) => (
                        <ListRow key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} isFirst={i === 0} />
                    ))}

                </View>

                {/* Coming soon */}
                <ThemedText variant="secondary" size="sm" weight="semibold" style={{ marginBottom: spacing.sm, marginLeft: 4 }}>COMING SOON</ThemedText>
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' }}>
                    {comingSoon.map((item, i) => (
                        <View
                            key={item.label}
                            accessible
                            accessibilityLabel={`${item.label}, coming soon. ${item.description}`}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceLight }}
                        >
                            <item.icon color={colors.textMuted} size={20} />
                            <View style={{ flex: 1 }}>
                                <ThemedText color={colors.textSecondary}>{item.label}</ThemedText>
                                <ThemedText variant="muted" size="xs">{item.description}</ThemedText>
                            </View>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.surfaceLight }}>
                                <ThemedText size="xs" weight="semibold" color={colors.textSecondary}>Soon</ThemedText>
                            </View>
                        </View>
                    ))}
                </View>

                <Button label="Log Out" variant="danger" icon={LogOut} onPress={handleLogout} isLoading={isLoggingOut} />

                <ThemedText variant="muted" size="xs" style={{ textAlign: 'center', marginTop: spacing.md }}>Signed in as {user?.email}</ThemedText>
            </ScrollView>
        </Screen>
    );
}