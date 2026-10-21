import { ActivityIndicator, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';
import { TextButton } from './Button';
import { ThemedText } from './ThemedText';

interface SheetHeaderProps {
    title: string;
    onCancel: () => void;
    /** Omit for read-only sheets (only Cancel/Close shows) */
    onSave?: () => void;
    saveLabel?: string;
    isSaving?: boolean;
    saveDisabled?: boolean;
    /** Read-only sheets: no Cancel, the right-hand action just closes */
    hideCancel?: boolean;
}

/**
 * iOS-style sheet bar: Cancel · Title · Save. Keeps the main action in the
 * same place on every sheet, so the body can be just the form.
 */
export function SheetHeader({ title, onCancel, onSave, saveLabel = 'Save', isSaving, saveDisabled, hideCancel }: SheetHeaderProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    // iOS sheets already sit below the status bar; Android modals are full-screen
    const topPadding = Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm;
    const canSave = !!onSave && !saveDisabled && !isSaving;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: topPadding,
                paddingBottom: spacing.md,
                paddingHorizontal: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: colors.surfaceLight,
                backgroundColor: colors.background,
            }}
        >
            <View style={{ minWidth: 64, alignItems: 'flex-start' }}>
                {!hideCancel && <TextButton label="Cancel" color={colors.textSecondary} weight="normal" hitSlop={12} onPress={onCancel} />}
            </View>

            <ThemedText weight="semibold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">
                {title}
            </ThemedText>

            <View style={{ minWidth: 64, alignItems: 'flex-end' }}>
                {onSave &&
                    (isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <TextButton
                            label={saveLabel}
                            hitSlop={12}
                            onPress={onSave}
                            disabled={!canSave}
                            accessibilityState={{ disabled: !canSave }}
                            style={{ opacity: canSave ? 1 : 0.35 }}
                        />
                    ))}
            </View>
        </View>
    );
}
