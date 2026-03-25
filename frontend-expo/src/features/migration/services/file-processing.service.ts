import { createFileId } from '@/shared/types/common.types';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError } from '@/shared/types/result.types';
import { uploadFile } from './excel.service';
import type { UploadedFile, TypeMappingRow } from '../types/migration.types';
import type { PickedFile } from '../hooks/useFileUpload';

// ─── Upload Options ────────────────────────────────────────────────────────

interface UploadFileCallbacks {
  readonly setLoading: (loading: boolean) => void;
  readonly setError: (error: AppError | null) => void;
  readonly setData: (file: UploadedFile, data: Record<string, unknown>[]) => void;
  readonly showSuccess: (title: string, message?: string) => void;
  readonly showError: (title: string, message?: string) => void;
}

interface UploadFileParams {
  readonly sourceErp?: string;
  readonly targetErp?: string;
  readonly fileName?: string;
}

export async function handleFileUpload(
  client: HttpClient,
  pickedFile: PickedFile,
  params: UploadFileParams,
  callbacks: UploadFileCallbacks,
  label: string,
): Promise<void> {
  callbacks.setLoading(true);
  callbacks.setError(null);
  try {
    const blob = await createBlobFromPickedFile(pickedFile);
    const result = await uploadFile(client, blob, params);
    if (result.ok) {
      const uploaded = buildUploadedFile(
        result.data.fileName, result.data.fileId, result.data.rowCount,
      );
      callbacks.setData(uploaded, result.data.sampleData);
      callbacks.showSuccess(`${label} uploaded`, `${result.data.rowCount} rows loaded`);
    } else {
      callbacks.setError(result.error);
      callbacks.showError('Upload failed', result.error.message);
    }
  } catch {
    const appError: AppError = {
      code: 'UPLOAD_ERROR',
      message: `Failed to process ${label.toLowerCase()}`,
    };
    callbacks.setError(appError);
    callbacks.showError('Upload failed', appError.message);
  } finally {
    callbacks.setLoading(false);
  }
}

export function buildUploadedFile(
  fileName: string,
  fileId: string,
  rowCount: number,
): UploadedFile {
  return { name: fileName, fileId: createFileId(fileId), rowCount };
}

export function extractTargetTypes(data: Record<string, unknown>[]): string[] {
  const typeKeys = ['type', 'account_type', 'accounttype', 'account type'];
  const types = new Set<string>();

  for (const row of data) {
    for (const key of typeKeys) {
      const value = row[key];
      if (typeof value === 'string' && value.length > 0) {
        types.add(value);
        break;
      }
    }
  }

  return Array.from(types);
}

export function buildTypeMappingRows(
  mappingData: Record<string, unknown>[],
): TypeMappingRow[] {
  return mappingData.map((row, index) => ({
    id: String(index),
    sourceType: typeof row['source_type'] === 'string' ? row['source_type'] : '',
    targetType: typeof row['target_type'] === 'string' ? row['target_type'] : '',
    isCustom: false,
  }));
}

export async function createBlobFromPickedFile(
  file: PickedFile,
): Promise<File | Blob> {
  if (file.file) {
    return file.file;
  }

  const response = await fetch(file.uri);
  const blob = await response.blob();
  return new File([blob], file.name, { type: file.mimeType });
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
