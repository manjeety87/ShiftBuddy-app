import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportMyData } from './account';

/**
 * Fetches a copy of the account, writes it to a dated JSON file in the cache and
 * opens the share sheet, so it can go to Files, Drive, email — wherever they keep things.
 */
export const shareMyData = async () => {
    const data = await exportMyData();
    const day = new Date().toISOString().slice(0, 10);
    const file = new File(Paths.cache, `shiftbuddy-data-${day}.json`);
    file.create({ overwrite: true });
    file.write(JSON.stringify(data, null, 2));
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Your ShiftBuddy data', UTI: 'public.json' });
};
