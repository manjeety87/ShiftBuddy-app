import type { ExtractedShift } from '../interfaces/shift.d';
import { api } from './api';
import { deviceTimeZone } from './dateUtils';

export const extractShiftsFromImage = async (
    imageUri: string,
    employeeName: string
): Promise<ExtractedShift[]> => {
    const formData = new FormData();

    formData.append('image', {
        uri: imageUri,
        name: 'schedule.jpg',
        type: 'image/jpeg',
    } as any);

    formData.append('employeeName', employeeName);
    // A schedule shows "9:00" with no zone — the backend reads it as this device's local time
    formData.append('timeZone', deviceTimeZone());

    const { data } = await api.post<{ data: { shifts: ExtractedShift[] } }>(
        '/ocr/extract-shifts',
        formData,
        {
            headers: { 'Content-Type': 'multipart/form-data' },
            // Reading a schedule can take a while (the backend retries when the
            // AI model is busy), so don't use the default 15s API timeout here.
            timeout: 60000,
        }
    );

    return data.data.shifts;
};