import { Tabs } from 'expo-router';
import { Briefcase, Calendar, Clock, Home, Settings } from 'lucide-react-native';
import { useTheme } from '../../lib/theme-context';

export default function TabsLayout() {
    // Read the live theme — the tab bar must follow theme changes like every screen.
    const { colors } = useTheme();

    return (
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
    );
}