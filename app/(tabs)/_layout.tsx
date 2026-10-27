import { router, Tabs, usePathname } from 'expo-router';
import { Briefcase, Calendar, Clock, Home, Mic, Settings } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../../components/ui/PressableScale';
import { useTheme } from '../../lib/theme-context';

// The tab bar's own height (React Navigation's default), above the home indicator
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

export default function TabsLayout() {
    // Read the live theme — the tab bar must follow theme changes like every screen.
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    // Tells the assistant where the person is ("open it" means something different on Calendar)
    const page = pathname === '/' ? 'home' : pathname.slice(1).split('/')[0];

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textMuted,
                    tabBarStyle: {
                        backgroundColor: colors.surface,
                        borderTopColor: colors.surfaceLight,
                        elevation: 0,
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size, focused }) => <Home color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />,
                    }}
                />
                <Tabs.Screen
                    name="shifts"
                    options={{
                        title: 'Shifts',
                        tabBarIcon: ({ color, size, focused }) => <Clock color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />,
                    }}
                />
                <Tabs.Screen
                    name="calendar"
                    options={{
                        title: 'Calendar',
                        tabBarIcon: ({ color, size, focused }) => <Calendar color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />,
                    }}
                />
                <Tabs.Screen
                    name="jobs"
                    options={{
                        title: 'Jobs',
                        tabBarIcon: ({ color, size, focused }) => <Briefcase color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />,
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color, size, focused }) => <Settings color={color} size={size} strokeWidth={focused ? 2.4 : 1.8} />,
                    }}
                />
            </Tabs>
            {/* The assistant, a thumb away on every tab, just above the tab bar */}
            <PressableScale
                onPress={() => router.push({ pathname: '/assistant', params: { from: page } })}
                accessibilityRole="button"
                accessibilityLabel="Assistant"
                pressedScale={0.92}
                style={{
                    position: 'absolute',
                    right: 16,
                    bottom: TAB_BAR_HEIGHT + insets.bottom + 12,
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)',
                }}
            >
                <Mic color={colors.onPrimary} size={22} />
            </PressableScale>
        </View>
    );
}