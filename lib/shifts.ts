import { PaySummary } from '@/interfaces/summary';
import type { CreateShiftInput, Shift, UpdateShiftInput } from '../interfaces/shift.d';
import { api } from './api';
import { deviceTimeZone } from './dateUtils';
import { requestReminderSync } from './reminders';
import { emitShiftsChanged } from './shiftEvents';

export const getMyShifts = async (params?: { from?: string; to?: string }): Promise<Shift[]> => {
    const { data } = await api.get<{ data: Shift[] }>('/shifts', { params });
    return data.data;
};

export const createShift = async (input: CreateShiftInput): Promise<Shift> => {
    const { data } = await api.post<{ data: Shift }>('/shifts', input);
    requestReminderSync();
    emitShiftsChanged();
    return data.data;
};

export interface BulkCreateResult {
    created: Shift[];
    skipped: CreateShiftInput[]; // overlapped an existing shift (usually a duplicate)
}

/** Creates many shifts at once; ones that would overlap an existing shift are skipped. */
export const createShiftsBulk = async (shifts: CreateShiftInput[]): Promise<BulkCreateResult> => {
    const { data } = await api.post<{ data: BulkCreateResult }>('/shifts/bulk', { shifts });
    requestReminderSync();
    emitShiftsChanged();
    return data.data;
};

export type CopyShiftsInput = { shiftIds: string[] } & (
    | { targetDates: string[] } // "YYYY-MM-DD" days to copy onto (the selection's first day lands on each)
    | { offsetDays: number } // move every copy by this many days (copy week → 7)
);

/**
 * Copies shifts on the server, in this device's time zone: same times of day (even
 * across DST), multi-day spacing kept, clashes with existing shifts skipped.
 */
export const copyShifts = async (input: CopyShiftsInput): Promise<BulkCreateResult> => {
    const { data } = await api.post<{ data: BulkCreateResult }>('/shifts/copy', { ...input, timeZone: deviceTimeZone() });
    requestReminderSync();
    emitShiftsChanged();
    return data.data;
};

export const updateShift = async (shiftId: string, input: UpdateShiftInput): Promise<Shift> => {
    const { data } = await api.patch<{ data: Shift }>(`/shifts/${shiftId}`, input);
    requestReminderSync();
    emitShiftsChanged();
    return data.data;
};

export const deleteShift = async (shiftId: string): Promise<void> => {
    await api.delete(`/shifts/${shiftId}`);
    requestReminderSync();
    emitShiftsChanged();
};

export const getShiftById = async (shiftId: string): Promise<Shift> => {
    const { data } = await api.get<{ data: Shift }>(`/shifts/${shiftId}`);
    return data.data;
};

export const getShiftsSummary = async (params?: { jobId?: string; from?: string; to?: string }): Promise<PaySummary> => {
    const { data } = await api.get<{ data: PaySummary }>('/shifts/summary', { params });
    return data.data;
};
/** The stretches a statement covers: a preset (`offset` -1 = the one before), or a first and last day (YYYY-MM-DD, both included). */
export type StatementRange = 'week' | 'twoWeeks' | 'month' | 'threeMonths';
export type StatementRequest = ({ range: StatementRange; offset?: number } | { range: 'custom'; from: string; to: string }) & { jobId?: string };

/** The shifts worked in a stretch as a PDF (`GET /shifts/statement`), under the file name the server gives it. */
export const getStatementPdf = async (request: StatementRequest): Promise<{ pdf: ArrayBuffer; filename: string }> => {
    const { data, headers } = await api.get<ArrayBuffer>('/shifts/statement', { params: { ...request, timeZone: deviceTimeZone() }, responseType: 'arraybuffer' });
    const filename = /filename="([^"]+)"/.exec(String(headers['content-disposition'] ?? ''))?.[1] ?? 'shiftbuddy-statement.pdf';
    return { pdf: data, filename };
};
