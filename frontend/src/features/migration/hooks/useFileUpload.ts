import { useState, useCallback } from 'react';
import { isWeb } from '@/shared/utils/platform.utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  file?: File;
}

interface UseFileUploadReturn {
  pickFile: () => Promise<PickedFile | null>;
  isUploading: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
] as const;

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv';

// ─── Web File Picker ────────────────────────────────────────────────────────

function pickFileWeb(): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_EXTENSIONS;
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];

      if (!file) {
        resolve(null);
        input.remove();
        return;
      }

      resolve({
        uri: URL.createObjectURL(file),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        file,
      });

      input.remove();
    });

    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  });
}

// ─── Native File Picker ─────────────────────────────────────────────────────

async function pickFileNative(): Promise<PickedFile | null> {
  const DocumentPicker = await import('expo-document-picker');

  const result = await DocumentPicker.getDocumentAsync({
    type: [...ACCEPTED_MIME_TYPES],
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset) {
    return null;
  }

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);

  const pickFile = useCallback(async (): Promise<PickedFile | null> => {
    setIsUploading(true);

    try {
      const file = isWeb ? await pickFileWeb() : await pickFileNative();
      return file;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { pickFile, isUploading };
}

export type { PickedFile, UseFileUploadReturn };
