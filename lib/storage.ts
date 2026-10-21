import type { User } from '../interfaces/user.d';
import { keyValueStore } from './keyValueStore';

const ACCESS_TOKEN_KEY = 'shiftbuddy_access_token';
const REFRESH_TOKEN_KEY = 'shiftbuddy_refresh_token';
const USER_KEY = 'shiftbuddy_user';

export const saveTokens = async (accessToken: string, refreshToken: string) => {
    await keyValueStore.setItem(ACCESS_TOKEN_KEY, accessToken);
    await keyValueStore.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = () => keyValueStore.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => keyValueStore.getItem(REFRESH_TOKEN_KEY);

/** The profile as last seen from the server — lets the app open signed in when the server can't be reached. */
export const saveCachedUser = (user: User) => keyValueStore.setItem(USER_KEY, JSON.stringify(user));

export const getCachedUser = async (): Promise<User | null> => {
    try {
        const raw = await keyValueStore.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
};

/** Signing out: tokens and the cached profile go together. */
export const clearTokens = async () => {
    await keyValueStore.deleteItem(ACCESS_TOKEN_KEY);
    await keyValueStore.deleteItem(REFRESH_TOKEN_KEY);
    await keyValueStore.deleteItem(USER_KEY);
};
