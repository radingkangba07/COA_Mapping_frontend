import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import {
  getHierarchicalMapping,
  buildCustomTypeMappings,
  applyCustomTypeMappings,
  normalizeGroupedMappings,
  saveMappings,
  toMappingCreateDTOs,
} from '../services/mapping.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { useSyncStep } from './useSyncStep';
import type { AppError } from '@/shared/types/result.types';

// ─── Return Type ────────────────────────────────────────────────────────────

interface UseFuzzyMapperReturn {
  readonly runMapping: () => Promise<void>;
  readonly isMapping: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFuzzyMapper(): UseFuzzyMapperReturn {
  const [isMapping, setIsMapping] = useState(false);

  const projectId = useMigrationStore((s) => s.projectId);
  const sourceData = useMigrationStore((s) => s.sourceData);
  const targetData = useMigrationStore((s) => s.targetData);
  const sourceERP = useMigrationStore((s) => s.sourceERP);
  const targetERP = useMigrationStore((s) => s.targetERP);
  const typeMappingRows = useMigrationStore((s) => s.typeMappingRows);

  const actions = useMigrationStore(
    useShallow((s) => ({
      setGroupedMappings: s.setGroupedMappings,
      setTargetTypes: s.setTargetTypes,
      completeStep: s.completeStep,
      setStep: s.setStep,
      setLoading: s.setLoading,
      setError: s.setError,
      markChangesSaved: s.markChangesSaved,
    })),
  );

  const { showSuccess, showError } = useToast();
  const syncStep = useSyncStep();

  const runMapping = useCallback(async (): Promise<void> => {
    setIsMapping(true);
    actions.setLoading(true);
    actions.setError(null);

    try {
      const customTypeMappings = buildCustomTypeMappings(typeMappingRows);

      const result = await getHierarchicalMapping(
        httpClient,
        sourceData,
        targetData.length > 0 ? targetData : undefined,
        sourceERP?.id,
        targetERP?.id,
      );

      if (!result.ok) {
        actions.setError(result.error);
        showError('Mapping failed', result.error.message);
        return;
      }

      const response = result.data;
      const normalized = normalizeGroupedMappings(response.grouped_mappings);
      const finalMappings = applyCustomTypeMappings(
        normalized,
        customTypeMappings,
      );

      if (response.target_types.length > 0) {
        actions.setTargetTypes([...response.target_types]);
      }

      actions.setGroupedMappings(finalMappings);

      if (projectId) {
        const dtos = toMappingCreateDTOs(projectId, finalMappings);
        const saveResult = await saveMappings(httpClient, dtos);
        if (!saveResult.ok) {
          actions.setError(saveResult.error);
          showError('Failed to save mappings', saveResult.error.message);
          return;
        }
      }

      actions.markChangesSaved();
      actions.completeStep(2);
      actions.setStep(3);
      syncStep(3);
      showSuccess(
        'Mapping complete',
        `Ready to map ${response.total_accounts} accounts across ${response.total_types} types`,
      );
    } catch {
      const mappingError: AppError = {
        code: 'MAPPING_ERROR',
        message: 'An unexpected error occurred while processing mappings',
      };
      actions.setError(mappingError);
      showError('Mapping failed', mappingError.message);
    } finally {
      setIsMapping(false);
      actions.setLoading(false);
    }
  }, [projectId, sourceData, targetData, sourceERP, targetERP, typeMappingRows, actions, showSuccess, showError, syncStep]);

  return { runMapping, isMapping };
}
