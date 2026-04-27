import { createFileId } from '@/shared/types/common.types';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError } from '@/shared/types/result.types';
import { uploadFile } from './excel.service';
import type { FileType } from './excel.service';
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
  readonly projectId?: string;
  readonly fileType?: FileType;
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

export function extractAccountTypes(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];

  // Find the type column dynamically (matches "type", "account_type", etc. but not "detail_type")
  const firstRow = data[0]!;
  const typeKey = Object.keys(firstRow).find((k: string) => {
    const lower = k.toLowerCase();
    return (lower.includes('type') && !lower.includes('detail')) || lower === 'type';
  });

  if (!typeKey) return [];

  const types = new Set<string>();
  for (const row of data) {
    const value = row[typeKey];
    if (typeof value === 'string' && value.trim().length > 0) {
      types.add(value.trim());
    }
  }
  return Array.from(types);
}

/** @deprecated Use extractAccountTypes instead */
export function extractTargetTypes(data: Record<string, unknown>[]): string[] {
  return extractAccountTypes(data);
}

function findColumnValue(row: Record<string, unknown>, search: string): string {
  const normalise = (s: string): string => s.toLowerCase().replace(/[_\s]/g, '');
  const target = normalise(search);
  for (const key of Object.keys(row)) {
    if (normalise(key) === target) {
      const val = row[key];
      return typeof val === 'string' ? val.trim() : '';
    }
  }
  return '';
}

export function buildTypeMappingRows(
  mappingData: Record<string, unknown>[],
): TypeMappingRow[] {
  return mappingData.map((row, index) => {
    const rawTarget = findColumnValue(row, 'target_type');
    const targetTypes = rawTarget.length > 0
      ? rawTarget
          .split(/[;,]/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
      : [];
    return {
      id: String(index),
      sourceType: findColumnValue(row, 'source_type'),
      targetTypes,
      isCustom: false,
    };
  });
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
