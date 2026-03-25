import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import { selectCurrentStep, selectMappingStats } from '../store/migration.selectors';
import type { MappingStats } from '../store/migration.selectors';
import type { GroupedMapping } from '../types/mapping.types';

// ─── Return Type ─────────────────────────────────────────────────────────────

export interface PreviewScreenViewModel {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly stats: MappingStats;
  readonly groupedMappings: GroupedMapping[];
  readonly projectId: string | null;
  readonly handleStepPress: (step: number) => void;
  readonly handleBack: () => void;
  readonly resetMigration: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePreviewScreenViewModel(
  projectId: string,
  navigateBack: (projectId: string) => void,
): PreviewScreenViewModel {
  const currentStep = useMigrationStore(selectCurrentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const stats = useMigrationStore(selectMappingStats);
  const groupedMappings = useMigrationStore((s) => s.groupedMappings);
  const storeProjectId = useMigrationStore((s) => s.projectId);

  const actions = useMigrationStore(useShallow((s) => ({
    setStep: s.setStep,
    reset: s.reset,
  })));

  const handleStepPress = useCallback(
    (step: number): void => {
      actions.setStep(step);
    },
    [actions],
  );

  const handleBack = useCallback((): void => {
    actions.setStep(3);
    navigateBack(projectId);
  }, [actions, navigateBack, projectId]);

  const resetMigration = useCallback((): void => {
    actions.reset();
  }, [actions]);

  return {
    currentStep,
    completedSteps,
    stats,
    groupedMappings,
    projectId: storeProjectId,
    handleStepPress,
    handleBack,
    resetMigration,
  };
}
