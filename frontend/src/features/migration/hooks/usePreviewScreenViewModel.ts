import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import { selectCurrentStep, computeMappingStats } from '../store/migration.selectors';
import type { MappingStats } from '../store/migration.selectors';
import type { GroupedMapping } from '../types/mapping.types';
import { getMappings } from '../services/mapping.service';
import { httpClient } from '@/shared/services/http/http.instance';

// ─── Return Type ─────────────────────────────────────────────────────────────

export interface PreviewScreenViewModel {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly stats: MappingStats;
  readonly groupedMappings: GroupedMapping[];
  readonly isFetchingMappings: boolean;
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
  const allMappings = useMigrationStore((s) => s.groupedMappings);
  const selection = useMigrationStore((s) => s.selection);

  const { data: apiMappings, isFetching: isFetchingMappings } = useQuery({
    queryKey: ['mappings', projectId],
    queryFn: async () => {
      const result = await getMappings(httpClient, projectId);
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: 30_000,
  });

  const groupedMappings = useMemo<GroupedMapping[]>(() => {
    // Filter accounts to confirmed/approved only, but keep ALL groups so that
    // totalTypes stays consistent with the Type Mapping step (14 types).
    // Groups with zero confirmed accounts still count toward the type total.
    const storeConfirmed: GroupedMapping[] = allMappings.map((group) => ({
      ...group,
      accounts: group.accounts.filter((a) => {
        const s = (a as { status?: string }).status;
        return s === 'confirmed' || s === 'approved';
      }),
    }));

    const apiConfirmedAllGroups: GroupedMapping[] = (apiMappings ?? []).map((group) => ({
      ...group,
      accounts: group.accounts.filter((a) => {
        const s = (a as { status?: string }).status;
        return s === 'confirmed' || s === 'approved';
      }),
    }));

    const hasStoreData = storeConfirmed.some((g) => g.accounts.length > 0);
    const source: GroupedMapping[] = hasStoreData ? storeConfirmed : apiConfirmedAllGroups;
    const selected = source
      .map((group) => ({
        ...group,
        accounts: group.accounts.filter(
          (a) =>
            a.is_active !== false &&
            selection[`${group.source_type}::${a.source_number ?? ''}::${a.source_name}`] === true,
        ),
      }))
      .filter((group) => group.accounts.length > 0);
    return selected.length > 0 ? selected : source;
  }, [allMappings, apiMappings, selection]);

  const stats = useMemo<MappingStats>(
    () => computeMappingStats(groupedMappings),
    [groupedMappings],
  );

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
    isFetchingMappings,
    projectId: storeProjectId,
    handleStepPress,
    handleBack,
    resetMigration,
  };
}
