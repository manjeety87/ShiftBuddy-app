import type { Shift } from '../interfaces/shift.d';

// Which part of each shift falls on which day (an overnight shift belongs to two days).

export interface DaySegment {
    shift: Shift;
    /** The part of the shift that falls on this day */
    start: Date;
    end: Date;
    continuesFromPreviousDay: boolean;
    continuesToNextDay: boolean;
}

export const startOfDay = (date: Date) => {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
};

export const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days); // keeps the wall-clock time across DST
    return next;
};

/** The pieces of `shifts` that fall on `day` — an overnight shift shows up on both days. */
export const segmentsForDay = (shifts: Shift[], day: Date): DaySegment[] => {
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);

    return shifts
        .map((shift) => {
            const shiftStart = new Date(shift.startTime);
            const shiftEnd = new Date(shift.endTime);
            const start = shiftStart > dayStart ? shiftStart : dayStart;
            const end = shiftEnd < dayEnd ? shiftEnd : dayEnd;
            if (end <= start) return null;
            return {
                shift,
                start,
                end,
                continuesFromPreviousDay: shiftStart < dayStart,
                continuesToNextDay: shiftEnd > dayEnd,
            };
        })
        .filter((segment): segment is DaySegment => segment !== null)
        .sort((a, b) => a.start.getTime() - b.start.getTime());
};
