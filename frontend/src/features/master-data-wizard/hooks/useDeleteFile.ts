/* ============================================================================
   useDeleteFile.ts  ·  Delete a persisted source file
   ----------------------------------------------------------------------------
   Wraps entity-pack.service.ts's deleteFile (DELETE /api/v1/storage/files/
   {fileId}) in a TanStack Query mutation, same pattern as
   useSourceFileUpload.ts — so screens only trigger the delete and read its
   status, with no direct HTTP handling of their own.

   Takes the discovery context (org_project_id/workstream_id/entityId) so a
   successful delete can invalidate useOrgProjectFiles' own cache entry
   (buildOrgProjectFilesKey) and drop the deleted file's useFileDetails cache
   entry (fileDetailsQueryKey) — "after delete: clear current file state,
   refresh metadata, hasFile=false" is this hook's job, not the caller's.
   Screens then only need to reset their own local/UI-only state (csvRows,
   preview toggles) alongside calling remove().
   ========================================================================= */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/useToast';
import type { AppError } from '@/shared/types/result.types';
import { deleteFile } from '../services/entity-pack.service';
import { buildOrgProjectFilesKey } from './useOrgProjectFiles';
import { fileDetailsQueryKey } from './useFileDetails';

export interface DeleteFileContext {
  readonly orgProjectId: string;
  readonly workstreamId?: string;
  readonly entityId: string;
}

export interface DeleteFileViewModel {
  readonly remove: (fileId: string) => void;
  readonly isRemoving: boolean;
  readonly error: AppError | null;
}

export function useDeleteFile(context: DeleteFileContext): DeleteFileViewModel {
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      const result = await deleteFile(fileId);
      if (!result.ok) {
        throw result.error;
      }
    },
    onSuccess: (_data, fileId) => {
      // The deleted id can only ever 404 from here on — drop it outright
      // rather than invalidate-and-refetch it.
      queryClient.removeQueries({
        queryKey: fileDetailsQueryKey(context.orgProjectId, context.entityId, context.workstreamId, fileId),
      });
      // Re-derive "does this orgProjectId+workstreamId+entityId have a
      // file" from the server — this is what actually flips hasFile back to
      // false for this hook's caller (and for any other component in this
      // tab watching the same discovery query, e.g. the wizard sidebar).
      void queryClient.invalidateQueries({
        queryKey: buildOrgProjectFilesKey(context.orgProjectId, context.workstreamId, context.entityId),
      });
    },
    onError: (error: AppError) => {
      toast.showError('Could not remove file', error.message);
    },
  });

  return {
    remove: (fileId: string) => mutation.mutate(fileId),
    isRemoving: mutation.isPending,
    error: (mutation.error as AppError | null) ?? null,
  };
}
