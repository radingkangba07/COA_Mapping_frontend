/* ============================================================================
   useOrgProjectFiles.ts  ·  Discovery — GET /api/v1/storage/org-project/
   {orgProjectId}/files
   ----------------------------------------------------------------------------
   This is Step 1's discovery call: given org_project_id + workstream_id +
   entity_id alone (no locally remembered fileId), find out whether this
   exact combination already has an uploaded source file, and if so, which
   one. MasterDataUploadScreen and MasterDataWizardScreen both call this on
   mount instead of reading any client-persisted "last uploaded file" record
   — there is none any more. This is what makes a second browser (or a fresh
   tab, or a reload) see the same file a first browser just uploaded: both
   ask the backend the same question, scoped by the same three ids, and get
   the same answer.

   `latestFile` (files[0]) is only a discovery result, not the canonical
   metadata — callers still confirm it via useFileDetails (GET
   /api/v1/storage/files/{fileId}), which is the one place hasFile/rowCount/
   columns should actually be read from (see that hook's own header comment).

   `hasFile` here is computed strictly from this API response —
   `files.length > 0 AND total > 0` — no local/session/zustand-persisted
   state ever feeds into it.

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
  fileMatchesContext,
  listOrgProjectFiles,
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

// Keyed by workstreamId AND entityId too (not just orgProjectId) — a project
// holds one workstream per master-data entity, and without this each
// entity's cache entry would collide with every other entity's in the same
// project. Exported so useDeleteFile.ts can invalidate the exact same key
// after a successful delete, without duplicating this shape.
export function buildOrgProjectFilesKey(orgProjectId: string, workstreamId?: string, entityId?: string) {
  return ['org-project-files', orgProjectId, workstreamId ?? null, entityId ?? null] as const;
}

export function useOrgProjectFiles(orgProjectId: string, workstreamId?: string, entityId?: string): OrgProjectFilesViewModel {
  const query = useQuery({
    queryKey: buildOrgProjectFilesKey(orgProjectId, workstreamId, entityId),
    queryFn: async (): Promise<OrgProjectFilesResult> => {
      const result = await listOrgProjectFiles(orgProjectId, workstreamId, entityId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: orgProjectId.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Server-shape defense in depth: even though listOrgProjectFiles already
  // asks the server to scope this list to org_project_id + workstream_id +
  // entity_id, this drops any file whose response DOES identify a different
  // project/entity/workstream than requested (see fileMatchesContext's own
  // comment on why a file that omits these fields still passes through) —
  // never surfaced as a Vendor file under Customer, etc., even if the
  // backend's own filter ever disagrees with what was asked for.
  const files = (query.data?.files ?? []).filter((f) => fileMatchesContext(f, { orgProjectId, entityId, workstreamId }));
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
