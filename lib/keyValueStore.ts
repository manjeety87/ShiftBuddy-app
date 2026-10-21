import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore (Keychain / Keystore) on the phone. It has no web implementation,
// so the browser build (dev previews) falls back to localStorage.
const isWeb = Platform.OS === 'web';

export const keyValueStore = {
    getItem: async (key: string): Promise<string | null> =>
        isWeb ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),

    setItem: async (key: string, value: string): Promise<void> => {
        if (isWeb) globalThis.localStorage?.setItem(key, value);
        else await SecureStore.setItemAsync(key, value);
    },

    deleteItem: async (key: string): Promise<void> => {
        if (isWeb) globalThis.localStorage?.removeItem(key);
        else await SecureStore.deleteItemAsync(key);
    },
};
