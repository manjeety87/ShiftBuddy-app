import type { Shift } from '../interfaces/shift.d';
import type { CommuteMode } from '../interfaces/user.d';
import { api } from './api';

export interface TravelConflict {
    /** late = you can't make it on time; tight = you'll arrive with under 5 minutes to spare */
    severity: 'late' | 'tight';
    mode: CommuteMode;
    fromShift: Shift;
    toShift: Shift;
    gapMinutes: number;
    travelMinutes: number;
    estimatedArrival: string;
    lateByMinutes: number;
    slackMinutes: number;
    /** Fix 1: leave the first job by this time to be on time (null = no trip makes it) */
    leaveBy: string | null;
    /** Fix 2: when you'd actually get to the next job if you leave as the first shift ends */
    earliestStart: string;
}

/** Back-to-back shifts you can't (or only just) get between in time. Defaults to the next 14 days. */
export const getTravelConflicts = async (params?: { from?: string; to?: string }): Promise<TravelConflict[]> => {
    const { data } = await api.get<{ data: { mode: CommuteMode; conflicts: TravelConflict[] } }>('/shifts/travel-conflicts', {
        params,
        timeout: 30000, // may need several routing lookups
    });
    return data.data.conflicts;
};

export const commuteLabel = (mode: CommuteMode) => (mode === 'DRIVING' ? 'driving' : 'transit');
