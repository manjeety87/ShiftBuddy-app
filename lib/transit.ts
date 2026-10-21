import { api } from './api';

export type TransitMode = 'WALK' | 'BUS' | 'SUBWAY' | 'TRAM' | 'RAIL' | 'REGIONAL_RAIL' | 'METRO' | 'FERRY' | (string & {});

export interface TransitStop {
    name: string | null; // null = the trip's start/end point (home, job)
    latitude: number;
    longitude: number;
    time: string | null;
}

export interface TransitLeg {
    mode: TransitMode;
    line: string | null; // "97", "Line 2", "LE"
    lineName: string | null; // "Yonge", "Lakeshore East"
    color: string | null; // the agency's own line colour
    textColor: string | null;
    agency: string | null;
    headsign: string | null;
    from: TransitStop;
    to: TransitStop;
    departure: string;
    arrival: string;
    durationMinutes: number;
    distanceMeters: number | null; // walking legs
    stopCount: number | null; // transit legs
    realTime: boolean;
    geometry: [number, number][]; // [lat, lng]
}

export interface TransitItinerary {
    departure: string;
    arrival: string;
    durationMinutes: number;
    transfers: number;
    walkMinutes: number;
    legs: TransitLeg[];
}

type Coords = { lat: number; lng: number };

/**
 * Bus/train options between two points. 'arrive' → trips that get there by
 * `time` (leave as late as possible first); 'depart' → trips leaving after it.
 */
export const getTransitPlan = async (from: Coords, to: Coords, time: Date, timeType: 'arrive' | 'depart'): Promise<TransitItinerary[]> => {
    const { data } = await api.get<{ data: { itineraries: TransitItinerary[] } }>('/transit/plan', {
        params: { fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng, time: time.toISOString(), timeType },
        timeout: 20000,
    });
    return data.data.itineraries;
};

export const isWalk = (leg: TransitLeg) => leg.mode === 'WALK';

export const modeLabel = (mode: TransitMode) => {
    switch (mode) {
        case 'BUS': return 'Bus';
        case 'SUBWAY':
        case 'METRO': return 'Subway';
        case 'TRAM': return 'Streetcar';
        case 'RAIL':
        case 'REGIONAL_RAIL': return 'Train';
        case 'FERRY': return 'Ferry';
        case 'WALK': return 'Walk';
        default: return 'Transit';
    }
};

export const formatDistance = (meters: number) =>
    meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
