import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../../constants/themes';
import { useTheme } from '../../lib/theme-context';

interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    /** The bar under the grabber — a title, or Cancel · Title · Done */
    header: ReactNode;
    children: ReactNode;
}

/**
 * A panel that slides up from the bottom over the screen (pickers, selects).
 * Tapping above it or Android back closes it — the same as Cancel.
 */
export function BottomSheet({ visible, onClose, header, children }: BottomSheetProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
            <View
                style={{
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: radius.xl,
                    borderTopRightRadius: radius.xl,
                    paddingBottom: insets.bottom + spacing.sm,
                    maxHeight: '80%',
                    // Static shadow — the sheet itself moves, the shadow never animates
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: -4 },
                    elevation: 16,
                }}
            >
                <View style={{ alignItems: 'center', paddingTop: 8 }}>
                    <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: colors.surfaceLight }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                    {header}
                </View>
                {children}
            </View>
        </Modal>
    );
}
