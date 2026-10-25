import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getStatementPdf, type StatementRequest } from './shifts';

/**
 * Fetches the statement PDF, writes it to the cache under the server's file name
 * and opens the share sheet, so it can go to Files, Drive, email — wherever they keep things.
 */
export const shareStatement = async (request: StatementRequest) => {
    const { pdf, filename } = await getStatementPdf(request);
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(new Uint8Array(pdf));
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Your shift statement', UTI: 'com.adobe.pdf' });
};
