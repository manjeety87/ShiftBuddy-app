import * as Location from 'expo-location';

export type CurrentLocation =
    | { status: 'ok'; lat: number; lng: number }
    | { status: 'denied' } // user said no to location permission
    | { status: 'unavailable' }; // location services off, no GPS fix, timed out

const TIMEOUT_MS = 10000;

export const getCurrentLocation = async (): Promise<CurrentLocation> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return { status: 'denied' };

        // getCurrentPositionAsync can hang indoors; fall back to the last known fix.
        const position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
        ]) ?? (await Location.getLastKnownPositionAsync());

        if (!position) return { status: 'unavailable' };
        return { status: 'ok', lat: position.coords.latitude, lng: position.coords.longitude };
    } catch {
        return { status: 'unavailable' };
    }
};
