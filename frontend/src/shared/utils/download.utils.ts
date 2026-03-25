import { Platform } from 'react-native';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';

/**
 * Downloads a blob to the user's device.
 * Web: creates an anchor element and triggers a click.
 * Native: uses expo-file-system + expo-sharing.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<Result<void, AppError>> {
  try {
    if (Platform.OS === 'web') {
      downloadBlobWeb(blob, filename);
      return ok(undefined);
    }

    return await downloadBlobNative(blob, filename);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return err({ code: 'DOWNLOAD_ERROR', message: error.message });
    }
    return err({ code: 'DOWNLOAD_ERROR', message: 'An unexpected error occurred during download' });
  }
}

function downloadBlobWeb(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadBlobNative(blob: Blob, filename: string): Promise<Result<void, AppError>> {
  try {
    const { documentDirectory, writeAsStringAsync, EncodingType } = await import(
      'expo-file-system/legacy'
    );
    const { shareAsync } = await import('expo-sharing');

    const fileUri = `${documentDirectory ?? ''}${filename}`;

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Failed to read blob as data URL'));
          return;
        }
        const base64Data = reader.result.split(',')[1] ?? '';
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    await writeAsStringAsync(fileUri, base64, {
      encoding: EncodingType.Base64,
    });

    await shareAsync(fileUri);

    return ok(undefined);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return err({ code: 'DOWNLOAD_ERROR', message: error.message });
    }
    return err({ code: 'DOWNLOAD_ERROR', message: 'Failed to download file on native platform' });
  }
}
