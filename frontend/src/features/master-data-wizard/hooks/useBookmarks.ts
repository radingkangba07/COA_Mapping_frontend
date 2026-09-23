import { useCallback, useState } from 'react';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { bookmarkMapping, unbookmarkMapping } from '../services/mapping.service';
import type { EntityId } from '../types/entity-pack.types';

interface Bookmarks {
  readonly isBookmarked: (rowId: string) => boolean;
  readonly toggleBookmark: (rowId: string) => void;
}

/**
 * DA-376 (UI) + real persistence (DA-401's `POST`/`DELETE .../bookmark`,
 * confirmed live). Row `id` is the real `mapping_id`. `seedBookmarkedIds`
 * comes from `useMappingData`'s `bookmarkedIds` (the GET response's
 * `is_bookmarked`, read once per load) — `overrides` layers this
 * session's own toggles on top, same "optimistic write, roll back +
 * toast on failure" shape `useApproval.confirm()` already established
 * for the sibling PATCH/PUT column-mappings endpoints. No pipeline run
 * yet for this entity: stays purely local, matching `useApproval`'s own
 * documented fallback.
 */
export function useBookmarks(entityId: EntityId, seedBookmarkedIds: ReadonlySet<string>): Bookmarks {
  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  // Keyed by project+entity (see wizard.store.ts's buildEntityKey) — same
  // convention setPipelineRunId itself writes with.
  const runId = useWizardStore((s) => s.pipelineRunIdByEntity[buildEntityKey(parentProjectId ?? '', entityId)]);
  const toast = useToast();
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  const isBookmarked = useCallback(
    (rowId: string) => overrides.get(rowId) ?? seedBookmarkedIds.has(rowId),
    [overrides, seedBookmarkedIds],
  );

  const toggleBookmark = useCallback(
    (rowId: string) => {
      const next = !isBookmarked(rowId);
      setOverrides((prev) => new Map(prev).set(rowId, next));

      if (!runId) return;

      const request = next ? bookmarkMapping(httpClient, runId, rowId) : unbookmarkMapping(httpClient, runId, rowId);
      request.then((result) => {
        if (!result.ok) {
          setOverrides((prev) => new Map(prev).set(rowId, !next));
          toast.showError('Could not save this bookmark', result.error.message);
        }
      });
    },
    [runId, isBookmarked, toast],
  );

  return { isBookmarked, toggleBookmark };
}
