/* ============================================================================
   useFileDetails.ts  ·  Single source of truth for a file's own row count
   ----------------------------------------------------------------------------
   Wraps entity-pack.service.ts's getFileById (GET /api/v1/storage/files/
   {fileId}) — the only place Source/Target row counts should ever read from.
   Never the POST /storage/upload response (useSourceFileUpload's `result`,
   or wizard.store's uploadedFileByEntity it feeds) — that reflects only the
   instant of upload and goes stale the moment a delete/refresh happens
   without a matching local-state update. Never listWorkstreamFiles' own
   row_count either — that endpoint's job is discovering *which* file is
   current for this project+entity+workstream, not reporting this file's
   up-to-date details.

   `fileId` is expected to come from one of two backend-only sources, never
   client storage: a fresh useSourceFileUpload response's own fileId
   (Step 3's "immediately confirm what was just uploaded"), or otherwise
   useOrgProjectFiles' `latestFile.id` — the discovery call scoped to this
   org_project_id+workstream_id+entity_id, which is what lets a second
   browser/tab that never made the upload still resolve the same file.
   Passing `null` (no file yet, or one just got deleted) disables the query
   and clears rowCount, rather than silently keeping a stale prior file's
   count on screen.

   Query key includes org_project_id + entityId + workstream_id + fileId (root
   task: "Isolate query/cache keys using org_project_id + entity_id +
   workstream_id + file_id") — a new upload's new fileId (or a delete's null)
   changes the key on its own, so no manual cross-hook invalidation is needed
   between this and useOrgProjectFiles; refetchOnMount/staleTime cover a
   fresh mount or page reload, and callers should call `refetch()` alongside
   useOrgProjectFiles' own refetch on focus/manual-refresh.

   Every response is re-validated against fileMatchesContext() before it's
   handed back — a file whose own org_project_id/entity_id/workstream_id
   (when the response actually carries them; today's real GET /storage/
   files/{id} response doesn't, so this is currently a no-op check, not a
   guarantee — see fileMatchesContext's own comment) disagrees with what
   this hook was called with is never surfaced as `file`/`rowCount`, even
   though it's still the query's cached `data` (so `isMismatched` can tell a
   caller to recover, e.g. by refetching useOrgProjectFiles' own list to
   resolve a different fileId).
   ========================================================================= */

import { useQuery } from '@tanstack/react-query';
import type { AppError } from '@/shared/types/result.types';
import { fileMatchesContext, getFileById, type PersistedFile } from '../services/entity-pack.service';

export interface FileDetailsViewModel {
  readonly file: PersistedFile | null;
  readonly rowCount: number | undefined;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
  /** True when a file was fetched but its own context fields disagree with orgProjectId/entityId/workstreamId — see this file's header comment. */
  readonly isMismatched: boolean;
}

export function fileDetailsQueryKey(
  orgProjectId: string,
  entityId: string,
  workstreamId: string | undefined,
  fileId: string | null,
) {
  return ['uploaded-file', orgProjectId, entityId, workstreamId ?? null, fileId ?? null] as const;
}

export function useFileDetails(
  orgProjectId: string,
  entityId: string,
  workstreamId: string | undefined,
  fileId: string | null,
): FileDetailsViewModel {
  const query = useQuery({
    queryKey: fileDetailsQueryKey(orgProjectId, entityId, workstreamId, fileId),
    queryFn: async (): Promise<PersistedFile> => {
      const result = await getFileById(fileId as string, { orgProjectId, entityId, workstreamId });
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: Boolean(fileId) && orgProjectId.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const isMismatched = query.data !== undefined
    && !fileMatchesContext(query.data, { orgProjectId, entityId, workstreamId });

  return {
    file: isMismatched ? null : query.data ?? null,
    rowCount: isMismatched ? undefined : query.data?.rowCount,
    isLoading: query.isLoading,
    error: (query.error as AppError | null) ?? null,
    refetch: () => void query.refetch(),
    isMismatched,
  };
}
