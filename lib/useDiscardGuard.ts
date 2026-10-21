import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useRef } from 'react';
import { showAlert } from './dialog';

/**
 * Asks "Discard changes?" before a form sheet closes with unsaved edits — on
 * Cancel, Android back, or an iOS swipe-down alike.
 *
 * Pass the form serialised as a string (`current`) and the same thing as it was
 * when the form opened (`baseline`; null while still loading). Call the returned
 * `leave()` instead of `router.back()` after a successful save or delete, so a
 * finished form closes without asking.
 */
export function useDiscardGuard(current: string, baseline: string | null) {
    const navigation = useNavigation();
    const isLeavingOnPurpose = useRef(false);
    const hasChanges = baseline !== null && current !== baseline;

    usePreventRemove(hasChanges, ({ data }) => {
        if (isLeavingOnPurpose.current) {
            navigation.dispatch(data.action);
            return;
        }
        showAlert('Discard changes?', 'Your changes won’t be saved.', [
            { text: 'Keep Editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
        ]);
    });

    const leave = useCallback(() => {
        isLeavingOnPurpose.current = true;
        router.back();
    }, []);

    return { hasChanges, leave };
}
