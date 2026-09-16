/* ============================================================================
   usePersistedFilePreview.ts  ·  Real preview rows for an already-uploaded file
   ----------------------------------------------------------------------------
   MasterDataUploadScreen's preview table normally reads csvRows, parsed
   client-side the moment a file is picked. That local state never survives
   a fresh mount (a refresh, a new tab, revisiting from another route) — the
   server's files-list endpoint only ever returns column names and a row
   count for that case, never actual cell values (see entity-pack.service.ts's
   listOrgProjectFiles).

   This hook covers exactly that gap: given a persisted file's id, it
   downloads the actual bytes (GET /api/v1/storage/download/{fileId}) and
   parses them with the same parseCSV every fresh upload already uses, so the
   preview table shows real server-backed data instead of nothing.

   Pass `null` (e.g. while a local csvRows parse already covers the preview)
   to skip the request entirely.
   ========================================================================= */

import { useQuery } from '@tanstack/react-query';
import type { AppError } from '@/shared/types/result.types';
import { downloadPersistedFile } from '../services/entity-pack.service';
import { parseCSV } from '../utils/csv';

export interface PersistedFilePreviewViewModel {
  readonly rows: readonly string[][];
  readonly isLoading: boolean;
  readonly error: AppError | null;
}

export function usePersistedFilePreview(fileId: string | null): PersistedFilePreviewViewModel {
  const query = useQuery({
    queryKey: ['persisted-file-preview', fileId],
    queryFn: async (): Promise<string[][]> => {
      const result = await downloadPersistedFile(fileId as string);
      if (!result.ok) throw result.error;
      return parseCSV(result.data);
    },
    enabled: fileId !== null && fileId.length > 0,
    // The bytes behind a given fileId never change (a new upload gets a new
    // id) — no reason to ever refetch the same one.
    staleTime: Infinity,
  });

  return {
    rows: query.data ?? [],
    isLoading: query.isLoading,
    error: (query.error as AppError | null) ?? null,
  };
}
