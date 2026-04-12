import { useState, useCallback } from 'react';
import { useMigrationStore } from '../store/migration.store';
import {
  buildCustomTypeMappings,
  applyCustomTypeMappings,
  normalizeGroupedMappings,
  saveMappings,
  toMappingCreateDTOs,
} from '../services/mapping.service';
import { useToast } from '@/shared/hooks/useToast';

// ─── Return Type ────────────────────────────────────────────────────────────

interface UseFuzzyMapperReturn {
  readonly runMapping: () => Promise<void>;
  readonly isMapping: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useFuzzyMapper(): UseFuzzyMapperReturn {
  // TODO: wire isMapping via WebSocket job-status updates
  const [isMapping] = useState(false);
  const { showSuccess, showError } = useToast();

  const runMapping = useCallback(async (): Promise<void> => {
    const { jobId } = useMigrationStore.getState();

    if (!jobId) {
      showError(
        'No mapping job found',
        'Go back to Upload and submit your files first.',
      );
      return;
    }

    showSuccess(
      'Mapping job submitted',
      'Results will appear when processing completes.',
    );
  }, [showError, showSuccess]);

  return { runMapping, isMapping };
}
