import Constants from 'expo-constants';

const DEPLOYED_API_URL = 'https://shiftbuddy-backend.onrender.com/api';
const LOCAL_API_PORT = 5000;

/**
 * In development, talk to the backend on the same computer that serves the app:
 * the phone already reached Metro at that address, so the backend is there too.
 * This survives Wi-Fi/hotspot changes without editing .env. (Tunnel mode gives a
 * public Expo host instead of the computer — then set EXPO_PUBLIC_API_URL.)
 */
const localDevApiUrl = (): string | null => {
    if (!__DEV__) return null;
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (!host || host.endsWith('.exp.direct')) return null;
    return `http://${host}:${LOCAL_API_PORT}/api`;
};

// Backend ka base URL — ek hi jagah, poore app me yahi se import hoga.
// Priority: EXPO_PUBLIC_API_URL (explicit override) → this computer in dev → deployed API.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || localDevApiUrl() || DEPLOYED_API_URL;
