import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMigrationStore } from '../store/migration.store';
import { httpClient } from '@/shared/services/http/http.instance';
import { saveMappings, toMappingCreateDTOs } from '../services/mapping.service';
import { useToast } from '@/shared/hooks/useToast';

interface UseSaveMappingsReturn {
  readonly save: () => Promise<boolean>;
  readonly isSaving: boolean;
}

/**
 * Save the current store snapshot of grouped mappings to the backend.
 * Returns true on success (including silent no-op when there are no diffs),
 * false on server error. Callers gate navigation on the boolean.
 */
export function useSaveMappings(projectId: string): UseSaveMappingsReturn {
  const markChangesSaved = useMigrationStore((s) => s.markChangesSaved);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;
    setIsSaving(true);
    const store = useMigrationStore.getState();
    const dtos = toMappingCreateDTOs(projectId, store.groupedMappings);
    if (dtos.length === 0) {
      setIsSaving(false);
      return true;
    }
    const result = await saveMappings(httpClient, projectId, dtos);
    if (result.ok) {
      markChangesSaved();
      const { inserted, updated } = result.data;
      showSuccess('Mappings saved', `${inserted} inserted, ${updated} updated`);
      void queryClient.invalidateQueries({
        queryKey: ['mapping-suggestions', projectId],
      });
      setIsSaving(false);
      return true;
    }
    showError('Save failed', result.error.message);
    setIsSaving(false);
    return false;
  }, [projectId, markChangesSaved, queryClient, showSuccess, showError]);

  return { save, isSaving };
}
