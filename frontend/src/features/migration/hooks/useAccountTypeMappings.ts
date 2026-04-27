import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { useMigrationStore } from '../store/migration.store';
import { selectHasUnsavedTypeMappings } from '../store/migration.selectors';
import {
  bulkSaveAccountTypeMappings,
  clearAccountTypeMappings,
  listAccountTypeMappings,
} from '../services/account-type.service';
import type { TypeMappingRow } from '../types/migration.types';
import type { AppError } from '@/shared/types/result.types';

interface UseAccountTypeMappingsReturn {
  readonly rows: readonly TypeMappingRow[];
  readonly availableTargetTypes: readonly string[];
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isDirty: boolean;
  readonly save: () => Promise<void>;
  readonly clear: () => Promise<void>;
}

function accountTypeMappingsQueryKey(projectId: string): readonly unknown[] {
  return ['account-type-mappings', projectId] as const;
}

export function useAccountTypeMappings(
  projectId: string,
): UseAccountTypeMappingsReturn {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const rows = useMigrationStore((s) => s.typeMappingRows);
  const availableTargetTypes = useMigrationStore((s) => s.targetTypes);
  const isDirty = useMigrationStore(selectHasUnsavedTypeMappings);
  const mappingFileId = useMigrationStore((s) => s.mappingFile?.fileId);

  const actions = useMigrationStore(
    useShallow((s) => ({
      hydrateTypeMappingRows: s.hydrateTypeMappingRows,
      markTypeMappingsSaved: s.markTypeMappingsSaved,
    })),
  );

  const listQuery = useQuery({
    queryKey: accountTypeMappingsQueryKey(projectId),
    queryFn: async (): Promise<readonly TypeMappingRow[]> => {
      const result = await listAccountTypeMappings(httpClient, projectId);
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    enabled: projectId.length > 0,
  });

  // Hydrate the store from the server only when it's empty and not dirty —
  // this preserves in-flight local edits. Runs as an effect to avoid setState
  // during render. Uses hydrateTypeMappingRows so the dirty flag stays false.
  const serverRows = listQuery.data;
  const rowsIsEmpty = rows.length === 0;
  useEffect(() => {
    if (
      serverRows !== undefined &&
      rowsIsEmpty &&
      !isDirty &&
      serverRows.length > 0
    ) {
      actions.hydrateTypeMappingRows([...serverRows]);
    }
  }, [serverRows, rowsIsEmpty, isDirty, actions]);

  const saveMutation = useMutation<{ count: number }, AppError, void>({
    mutationFn: async (): Promise<{ count: number }> => {
      const result = await bulkSaveAccountTypeMappings(
        httpClient,
        projectId,
        rows,
        mappingFileId,
      );
      if (!result.ok) {
        throw result.error;
      }
      return result.data;
    },
    onSuccess: (): void => {
      actions.markTypeMappingsSaved();
      void queryClient.invalidateQueries({
        queryKey: accountTypeMappingsQueryKey(projectId),
      });
      // Report the count of source type groups saved, not the fanned-out
      // source/target pair count returned by the backend — that's confusing
      // to users editing the grouped table UI.
      const sourceCount = rows.filter((r) => r.targetTypes.length > 0).length;
      showSuccess(
        'Type mappings saved',
        `${String(sourceCount)} type mapping${sourceCount === 1 ? '' : 's'} saved.`,
      );
    },
    onError: (error): void => {
      showError('Failed to save type mappings', error.message);
    },
  });

  const clearMutation = useMutation<void, AppError, void>({
    mutationFn: async (): Promise<void> => {
      const result = await clearAccountTypeMappings(httpClient, projectId);
      if (!result.ok) {
        throw result.error;
      }
    },
    onSuccess: (): void => {
      actions.hydrateTypeMappingRows([]);
      actions.markTypeMappingsSaved();
      void queryClient.invalidateQueries({
        queryKey: accountTypeMappingsQueryKey(projectId),
      });
      showSuccess('Type mappings cleared', 'All mappings for this project were removed.');
    },
    onError: (error): void => {
      showError('Failed to clear type mappings', error.message);
    },
  });

  const save = useCallback(async (): Promise<void> => {
    await saveMutation.mutateAsync();
  }, [saveMutation]);

  const clear = useCallback(async (): Promise<void> => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  return {
    rows,
    availableTargetTypes,
    isLoading: listQuery.isLoading,
    isSaving: saveMutation.isPending || clearMutation.isPending,
    isDirty,
    save,
    clear,
  };
}
