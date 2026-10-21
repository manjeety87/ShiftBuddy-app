import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { emitSessionExpired } from './authEvents';
import { notify } from './notify';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './storage';

// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the documented API
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Har request se pehle chalta hai — access token attach karta hai
api.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// One refresh at a time. Screens fire several requests at once (Home loads the
// week, upcoming shifts and reminders together); when the access token expires
// they all get 401 — every one of them waits for the same refresh and retries,
// instead of the first refreshing and the rest failing.
let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    // Plain axios, not `api` — a 401 here must not loop back into this interceptor
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
    await saveTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
};

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// On these a 401 means "wrong email/password/code", not "session expired" —
// the screen must see the real error message.
const CREDENTIAL_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/google', '/auth/apple', '/auth/restore', '/auth/forgot-password', '/auth/reset-password', '/auth/change-password', '/account/deletion'];

// Dev only: when the phone can't reach the backend at all, say where it looked.
// Usually the network changed (Wi-Fi ↔ hotspot) after Metro started, so the app
// still points at the old address — restarting Metro fixes it.
let lastUnreachableWarning = 0;
const warnBackendUnreachable = () => {
    if (!__DEV__ || Date.now() - lastUnreachableWarning < 30_000) return;
    lastUnreachableWarning = Date.now();
    console.warn(`Can't reach the backend at ${API_BASE_URL}`);
    notify.error('Can’t reach the backend', { description: `${API_BASE_URL} — changed networks? Restart Metro (npx expo start -c).` });
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response && error.code !== 'ERR_CANCELED') warnBackendUnreachable();
        const originalRequest = error.config as RetryableConfig | undefined;
        const isCredentialCheck = CREDENTIAL_ENDPOINTS.some((path) => originalRequest?.url?.startsWith(path));

        // 401 aaya, aur ye pehli retry hai (infinite loop se bachne ke liye)
        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isCredentialCheck) {
            return Promise.reject(error);
        }
        originalRequest._retry = true;

        try {
            refreshInFlight ??= refreshAccessToken().finally(() => {
                refreshInFlight = null;
            });
            const accessToken = await refreshInFlight;

            // Original request ko naye token ke saath dobara try karo
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
        } catch (refreshError: any) {
            // Only a refusal from the server ends the session. If the refresh simply
            // couldn't be sent (no signal, server down) the tokens are still good —
            // signing the user out for a dropped connection would be wrong.
            if (refreshError?.response || refreshError?.message === 'No refresh token') {
                await clearTokens();
                emitSessionExpired();
            }
            return Promise.reject(refreshError);
        }
    }
);
