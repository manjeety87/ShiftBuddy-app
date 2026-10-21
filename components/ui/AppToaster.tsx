import { Toaster } from 'sonner-native';
import { radius } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

/** The single toast outlet, styled from the current theme. Mounted once in the root layout. */
export function AppToaster() {
    const { colors } = useTheme();
    return (
        <Toaster
            position="bottom-center"
            theme={colors.isDark ? 'dark' : 'light'}
            offset={96} // clear of the tab bar
            swipeToDismissDirection="left"
            toastOptions={{
                style: {
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: colors.surfaceLight,
                },
                titleStyle: { color: colors.textPrimary, fontWeight: '600' },
                descriptionStyle: { color: colors.textSecondary },
                actionButtonStyle: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12 },
                actionButtonTextStyle: { color: colors.onPrimary, fontWeight: '600' },
            }}
        />
    );
}
