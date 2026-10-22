import type { PendingDeletion } from '../interfaces/account.d';
import { showAlert } from './dialog';
import { notify } from './notify';

/**
 * Signed in to an account that is waiting to be deleted (password, Google or
 * Apple alike). Bringing it back is their decision, so it's a clear question,
 * not a side effect of logging in. `restore` is the auth context's.
 */
export const offerRestore = (pending: PendingDeletion, restore: (restoreToken: string) => Promise<void>, onFailed?: (message: string) => void) => {
    const day = new Date(pending.purgeAt).toLocaleDateString(undefined, { dateStyle: 'long' });
    showAlert('Restore your account?', `It’s set to be deleted on ${day}. Restore it and everything comes back — your jobs, shifts and hours, just as you left them.`, [
        { text: 'Not Now', style: 'cancel' },
        {
            text: 'Restore Account',
            onPress: async () => {
                try {
                    await restore(pending.restoreToken);
                    notify.success('Welcome back! Your account is restored.');
                } catch (err: any) {
                    const message = err?.response?.data?.message || 'Couldn’t restore your account. Please try again.';
                    if (onFailed) onFailed(message);
                    else notify.error(message);
                }
            },
        },
    ]);
};
