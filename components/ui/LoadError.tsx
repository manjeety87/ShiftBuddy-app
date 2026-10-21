import { CloudOff, RotateCw } from 'lucide-react-native';
import { RefreshControl, ScrollView, View } from 'react-native';
import { spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import { TextButton } from './Button';
import { ThemedText } from './ThemedText';

interface LoadErrorProps {
    message: string;
    onRetry: () => void;
    /**
     * Set on screens where the list itself is the only scrolling thing: the error
     * replaces that list, so it brings its own pull-to-refresh. Leave off when the
     * error already sits inside a scroll view.
     */
    pullToRefresh?: { isRefreshing: boolean };
}

/** "Couldn't load" for a whole screen or section — always with a button, because a message alone is a dead end. */
export function LoadError({ message, onRetry, pullToRefresh }: LoadErrorProps) {
    const { colors } = useTheme();

    const content = (
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
            <CloudOff color={colors.textMuted} size={36} />
            <ThemedText variant="secondary" style={{ textAlign: 'center' }}>{message}</ThemedText>
            <TextButton label="Try Again" icon={RotateCw} onPress={onRetry} />
        </View>
    );

    if (!pullToRefresh) return content;
    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={pullToRefresh.isRefreshing} onRefresh={onRetry} tintColor={colors.primary} />}
        >
            {content}
        </ScrollView>
    );
}
