/* ============================================================================
   useOrgProjectFiles.ts  ·  Discovery — GET /api/v1/files/workstream/
   {workstream_id}
   ----------------------------------------------------------------------------
   This is Step 1's discovery call: given workstream_id (+ entity_id/
   org_project_id alongside it, no locally remembered fileId), find out
   whether this exact workstream already has an uploaded source file, and if
   so, which one. MasterDataUploadScreen and MasterDataWizardScreen both call
   this on mount instead of reading any client-persisted "last uploaded file"
   record — there is none any more. This is what makes a second browser (or a
   fresh tab, or a reload) see the same file a first browser just uploaded:
   both ask the backend the same question, scoped by the same workstream, and
   get the same answer.

   This response IS the single source of truth for the FileUploader state —
   `latestFile` (files[0], after the workstream filter below) is what
   MasterDataUploadScreen populates the file card from directly (filename,
   row count, columns, status), not a second per-file GET. There is
   deliberately no separate "confirm via getFileById" step: one backend
   call, filtered client-side by workstream_id, is the whole answer to
   "does this workstream have a file, and what does it look like".

   Filtered by workstream_id only, not entity_id — confirmed directly
   against the live backend that entity_id doesn't exist as a concept
   there at all (see matchesWorkstream's own comment in
   entity-pack.service.ts). entityId is still accepted and sent through to
   listWorkstreamFiles as a query param, for whenever the backend starts
   using it server-side, but it plays no part in the client-side filter
   below — filtering on a field that can never be present would mean this
   never finds a file, which is exactly the regression matchesWorkstream
   replaces.

   `hasFile` here is computed strictly from this API response —
   `files.length > 0 AND total > 0` — no local/session/zustand-persisted
   state, and no other endpoint's response, ever feeds into it.

   refetchOnMount: 'always' covers a fresh mount (first load, browser
   refresh, a new tab — each starts with no cache to begin with anyway).
   useFocusEffect (wired by the screen, not here — this hook only exposes
   `refetch`) covers the case a mount-based option can't: React Navigation
   returning focus to an already-mounted screen without remounting it.

   Delete (DELETE /api/v1/storage/files/{fileId}) lives in useDeleteFile.ts,
   not here — one hook, one concern (CLAUDE.md ISP). useDeleteFile
   invalidates this hook's own query key (buildOrgProjectFilesKey, exported
   below) on success, so a successful Remove is what actually flips this
   hook's hasFile back to false.
   ========================================================================= */

import { useQuery } from '@tanstack/react-query';
import type { AppError } from '@/shared/types/result.types';
import {
  listWorkstreamFiles,
  matchesWorkstream,
  type OrgProjectFilesResult,
  type PersistedFile,
} from '../services/entity-pack.service';

export interface OrgProjectFilesViewModel {
  readonly files: readonly PersistedFile[];
  readonly total: number;
  /** Strictly `files.length > 0 && total > 0` — see this file's own doc comment. */
  readonly hasFile: boolean;
  readonly latestFile: PersistedFile | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly refetch: () => void;
}

// Keyed by workstream_id AND entityId too (not just org_project_id) — a project
// holds one workstream per master-data entity, and without this each
// entity's cache entry would collide with every other entity's in the same
// project. Exported so useDeleteFile.ts can invalidate the exact same key
// after a successful delete, without duplicating this shape. org_project_id
// stays part of the key (even though listWorkstreamFiles no longer keys its
// request path on it) purely to keep this cache entry namespaced the same
// way it always has — callers/tests that build this key are unaffected by
// the endpoint change above.
export function buildOrgProjectFilesKey(orgProjectId: string, workstreamId?: string, entityId?: string) {
  return ['org-project-files', orgProjectId, workstreamId ?? null, entityId ?? null] as const;
}

export function useOrgProjectFiles(orgProjectId: string, workstreamId?: string, entityId?: string): OrgProjectFilesViewModel {
  const query = useQuery({
    queryKey: buildOrgProjectFilesKey(orgProjectId, workstreamId, entityId),
    queryFn: async (): Promise<OrgProjectFilesResult> => {
      const result = await listWorkstreamFiles(workstreamId as string, entityId, orgProjectId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    // Gated on workstreamId, not orgProjectId — listWorkstreamFiles is
    // keyed by workstreamId in its request path, so that's what must be
    // present before this query is allowed to fire. In practice both are
    // seeded together by MasterDataWizardScreen before any caller mounts
    // (see MasterDataUploadScreen's own workstreamId/orgProjectId reads).
    enabled: Boolean(workstreamId && workstreamId.length > 0),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Client-side re-filter, workstreamId only — see matchesWorkstream's own
  // comment for why entity_id plays no part here (the backend has no such
  // concept today). Lenient: only drops a file that actually carries a
  // workstreamId disagreeing with the caller's selection, so this starts
  // enforcing automatically once the backend adds workstream_id to
  // FileResponse, with no frontend change required then. A caller that
  // omits workstreamId (wants the project's full list) skips this filter
  // entirely rather than matching against `undefined`.
  const files = (query.data?.files ?? []).filter((f) =>
    workstreamId !== undefined ? matchesWorkstream(f, workstreamId) : true,
  );
  const total = query.data?.total ?? 0;

  return {
    files,
    total,
    hasFile: files.length > 0 && total > 0,
    latestFile: files[0] ?? null,
    isLoading: query.isLoading,
    error: (query.error as AppError | null) ?? null,
    refetch: () => void query.refetch(),
  };
}
