/* ============================================================================
   useSourceFileUpload.ts  ·  Upload the Step 1 source file
   ----------------------------------------------------------------------------
   Wraps services/entity-pack.service.ts's uploadSourceFile (POST /api/v1/storage/upload) in a
   TanStack Query mutation so MasterDataUploadScreen only triggers the upload
   and reads its status — no direct HTTP/FormData handling in the screen
   (root CLAUDE.md, Clean Architecture layers: Screens -> Hooks -> Services).
   Toast feedback follows the same onSuccess/onError pattern as
   features/projects/hooks/useCreateProject.ts.
   ========================================================================= */

import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/useToast';
import { httpClient } from '@/shared/services/http/http.instance';
import type { AppError } from '@/shared/types/result.types';
import type { UploadedFile } from '@/shared/components/ui/FileUploader';
import { uploadSourceFile, type UploadSourceFileOptions } from '../services/entity-pack.service';
import type { UploadResult } from '../types/upload.types';

export interface SourceFileUploadViewModel {
  readonly upload: (file: UploadedFile) => void;
  readonly result: UploadResult | null;
  readonly isUploading: boolean;
  readonly error: AppError | null;
  readonly reset: () => void;
}

export function useSourceFileUpload(options: UploadSourceFileOptions): SourceFileUploadViewModel {
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: async (file: UploadedFile): Promise<UploadResult> => {
      const result = await uploadSourceFile(httpClient, file, options);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: (data) => {
      toast.showSuccess('File uploaded', data.fileName);
    },
    onError: (error: AppError) => {
      toast.showError('Upload failed', error.message);
    },
  });

  return {
    upload: (file: UploadedFile) => mutation.mutate(file),
    result: mutation.data ?? null,
    isUploading: mutation.isPending,
    error: (mutation.error as AppError | null) ?? null,
    reset: mutation.reset,
  };
}
