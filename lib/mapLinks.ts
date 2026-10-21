import { Linking, Platform } from 'react-native';

type Coords = { lat: number; lng: number };
type TravelMode = 'driving' | 'transit';

// Without an origin the maps app starts from wherever the phone is.
const googleMapsUrl = (dest: Coords, mode: TravelMode, origin?: Coords) =>
    `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=${mode}` +
    (origin ? `&origin=${origin.lat},${origin.lng}` : '');

// https://maps.apple.com is Apple's universal link — it opens the Maps app and,
// unlike the maps:// scheme, Expo Go is allowed to open it.
const appleMapsUrl = (dest: Coords, mode: TravelMode, origin?: Coords) =>
    `https://maps.apple.com/?daddr=${dest.lat},${dest.lng}&dirflg=${mode === 'transit' ? 'r' : 'd'}` +
    (origin ? `&saddr=${origin.lat},${origin.lng}` : '');

const openFirstAvailable = async (urls: string[]) => {
    for (const url of urls) {
        try {
            await Linking.openURL(url);
            return;
        } catch {
            // try the next one
        }
    }
};

/** Opens directions in the phone's maps app, falling back to Google Maps in the browser. */
const openDirections = (dest: Coords, mode: TravelMode, origin?: Coords) => {
    if (Platform.OS === 'ios') {
        return openFirstAvailable([appleMapsUrl(dest, mode, origin), googleMapsUrl(dest, mode, origin)]);
    }
    // google.navigation: starts turn-by-turn right away but can't take a start point
    const navigation = !origin ? [`google.navigation:q=${dest.lat},${dest.lng}&mode=${mode === 'transit' ? 'transit' : 'd'}`] : [];
    return openFirstAvailable([...navigation, googleMapsUrl(dest, mode, origin)]);
};

export const openDrivingDirections = (dest: Coords, origin?: Coords) => openDirections(dest, 'driving', origin);

export const openTransitDirections = (dest: Coords, origin?: Coords) => openDirections(dest, 'transit', origin);
