import { useCallback, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueryClient } from '@tanstack/react-query';
import { useMigrationStore } from '../store/migration.store';
import {
  selectMappingStats,
  selectAllConfirmed,
  applyConfidenceFilter,
} from '../store/migration.selectors';
import { useSyncStep } from './useSyncStep';
import { useValidation } from './useValidation';
import { useToast } from '@/shared/hooks/useToast';
import {
  saveMappings,
  toMappingCreateDTOs,
  updateMappingStatus,
} from '../services/mapping.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';
import type { ConfidenceLevel, AccountMapping, GroupedMapping } from '../types/mapping.types';
import type { UploadedFile } from '../types/migration.types';
import type { ERPSystem } from '../types/erp.types';
import type { ValidationIssue } from '../types/validation.types';

// ─── Return Type ────────────────────────────────────────────────────────────

interface MappingStats {
  readonly totalTypes: number;
  readonly totalAccounts: number;
  readonly highConfidence: number;
  readonly mediumConfidence: number;
  readonly lowConfidence: number;
  readonly confirmedCount: number;
}

interface ValidationScreenViewModel {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly sourceFile: UploadedFile | null;
  readonly sourceERP: ERPSystem | null;
  readonly targetERP: ERPSystem | null;
  readonly confidenceFilter: ConfidenceLevel | null;
  readonly confirmedHigh: boolean;
  readonly confirmedMedium: boolean;
  readonly confirmedLow: boolean;
  readonly deletedAccounts: readonly { sourceType: string; sourceNumber: string; sourceName: string }[];
  readonly targetTypes: readonly string[];
  readonly targetAccountNames: readonly string[];
  readonly stats: MappingStats;
  readonly filteredMappings: GroupedMapping[];
  readonly allConfirmed: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly isDeletedOpen: boolean;
  readonly handleStepPress: (step: number) => void;
  readonly handleFilterPress: (filter: ConfidenceLevel | null) => void;
  readonly handleConfirm: (level: ConfidenceLevel) => Promise<void>;
  readonly handleTypeChange: (sourceType: string, newTargetType: string) => void;
  readonly handleAccountNameChange: (sourceType: string, accountIndex: number, newName: string, sourceName?: string, suggestionId?: string) => void;
  readonly handleDeleteAccount: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  readonly handleRestoreAccount: (deletedIndex: number) => void;
  readonly handleToggleDeleted: () => void;
  readonly handleBack: () => void;
  readonly handleContinue: () => void;
  readonly handleSaveMappings: () => Promise<boolean>;
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useValidationScreenViewModel(
  projectId: string,
  navigateBack: (projectId: string) => void,
  navigateForward: (projectId: string) => void,
): ValidationScreenViewModel {
  const currentStep = useMigrationStore((s) => s.currentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const sourceFile = useMigrationStore((s) => s.sourceFile);
  const sourceERP = useMigrationStore((s) => s.sourceERP);
  const targetERP = useMigrationStore((s) => s.targetERP);
  const groupedMappings = useMigrationStore((s) => s.groupedMappings);
  const storeFilter = useMigrationStore((s) => s.confidenceFilter);
  const [confidenceFilter, setLocalFilter] = useState<ConfidenceLevel | null>(storeFilter);

  // Sync local state when store resets the filter externally (e.g. project switch via setProjectId).
  const prevStoreFilter = useRef(storeFilter);
  if (prevStoreFilter.current !== storeFilter) {
    prevStoreFilter.current = storeFilter;
    setLocalFilter(storeFilter);
  }

  const confirmedHigh = useMigrationStore((s) => s.confirmedHigh);
  const confirmedMedium = useMigrationStore((s) => s.confirmedMedium);
  const confirmedLow = useMigrationStore((s) => s.confirmedLow);
  const targetTypes = useMigrationStore((s) => s.targetTypes);
  const targetData = useMigrationStore((s) => s.targetData);
  const hasUnsavedChanges = useMigrationStore((s) => s.hasUnsavedChanges);
  const stats = useMigrationStore(useShallow(selectMappingStats));
  const allConfirmed = useMigrationStore(selectAllConfirmed);

  // Derived lists live here (not as store selectors) so their referential
  // identity only changes when their real deps change — otherwise useShallow
  // trips the subscription every render (new arrays/objects each call).
  const filteredMappings = useMemo(
    () => applyConfidenceFilter(groupedMappings, confidenceFilter),
    [groupedMappings, confidenceFilter],
  );

  const deletedAccounts = useMemo(() => {
    const out: { sourceType: string; sourceNumber: string; sourceName: string }[] = [];
    for (const group of groupedMappings) {
      for (const a of group.accounts) {
        if (a.is_active === false) {
          out.push({
            sourceType: group.source_type,
            sourceNumber: a.source_number,
            sourceName: a.source_name,
          });
        }
      }
    }
    return out;
  }, [groupedMappings]);

  const actions = useMigrationStore(useShallow((s) => ({
    setStep: s.setStep,
    completeStep: s.completeStep,
    confirmConfidenceLevel: s.confirmConfidenceLevel,
    updateTypeMapping: s.updateTypeMapping,
    updateAccountName: s.updateAccountName,
    deleteAccount: s.deleteAccount,
    restoreAccount: s.restoreAccount,
    markChangesSaved: s.markChangesSaved,
    setConfidenceFilter: s.setConfidenceFilter,
  })));

  const syncStep = useSyncStep();
  const { errors, warnings } = useValidation();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const confirmInFlightRef = useRef<boolean>(false);

  const invalidateSuggestions = useCallback((): void => {
    void queryClient.invalidateQueries({
      queryKey: ['mapping-suggestions', projectId],
    });
  }, [queryClient, projectId]);

  const targetAccountNames = useMemo<string[]>(() => {
    const firstRow = targetData[0];
    if (!firstRow) return [];
    const nameCol = Object.keys(firstRow).find(
      (k) => k.toLowerCase().includes('name') || k.toLowerCase().includes('title'),
    );
    if (!nameCol) return [];
    return [...new Set(
      targetData.map((r) => String(r[nameCol] ?? '').trim()).filter(Boolean),
    )].sort();
  }, [targetData]);

  const handleStepPress = useCallback(
    (step: number): void => { actions.setStep(step); }, [actions]);
  const handleFilterPress = useCallback(
    (filter: ConfidenceLevel | null): void => {
      setLocalFilter(filter);
      actions.setConfidenceFilter(filter);
    }, [actions]);
  const handleConfirm = useCallback(
    async (level: ConfidenceLevel): Promise<void> => {
      if (confirmInFlightRef.current) return;
      confirmInFlightRef.current = true;
      try {
        actions.confirmConfidenceLevel(level);
        const isNowConfirmed =
          level === 'high'
            ? useMigrationStore.getState().confirmedHigh
            : level === 'medium'
            ? useMigrationStore.getState().confirmedMedium
            : useMigrationStore.getState().confirmedLow;
        const minScore =
          level === 'high'
            ? CONFIDENCE_THRESHOLDS.HIGH
            : level === 'medium'
            ? CONFIDENCE_THRESHOLDS.MEDIUM
            : 0;
        const maxScore =
          level === 'high'
            ? 100
            : level === 'medium'
            ? CONFIDENCE_THRESHOLDS.HIGH
            : CONFIDENCE_THRESHOLDS.MEDIUM;

        const statusResult = await updateMappingStatus(
          httpClient,
          projectId,
          minScore,
          isNowConfirmed ? 'confirmed' : 'pending',
          maxScore,
        );
        if (!statusResult.ok) {
          actions.confirmConfidenceLevel(level); // revert local toggle
          showError('Confirm failed', statusResult.error.message);
          return;
        }
        invalidateSuggestions();
        showSuccess(
          'Confirmed',
          isNowConfirmed
            ? `${level.charAt(0).toUpperCase() + level.slice(1)} score confirmed`
            : `${level.charAt(0).toUpperCase() + level.slice(1)} score un-confirmed`,
        );
      } finally {
        confirmInFlightRef.current = false;
      }
    }, [actions, projectId, showError, showSuccess, invalidateSuggestions]);
  const handleTypeChange = useCallback(
    (sourceType: string, newTargetType: string): void => { actions.updateTypeMapping(sourceType, newTargetType); }, [actions]);
  const handleAccountNameChange = useCallback(
    (sourceType: string, accountIndex: number, newName: string, sourceName?: string, suggestionId?: string): void => {
      actions.updateAccountName(sourceType, accountIndex, newName, 'User', sourceName, suggestionId);
    }, [actions]);
  const handleDeleteAccount = useCallback(
    (sourceType: string, _accountIndex: number, account: AccountMapping): void => {
      actions.deleteAccount(sourceType, account.source_name, account.suggestion_id);
    }, [actions]);
  const handleRestoreAccount = useCallback(
    (deletedIndex: number): void => { actions.restoreAccount(deletedIndex); }, [actions]);
  const handleToggleDeleted = useCallback(
    (): void => { setIsDeletedOpen((prev) => !prev); }, []);
  const handleBack = useCallback((): void => {
    actions.setStep(2);
    navigateBack(projectId);
  }, [actions, navigateBack, projectId]);
  const handleSaveMappings = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;
    setIsSaving(true);
    const store = useMigrationStore.getState();
    const dtos = toMappingCreateDTOs(projectId, store.groupedMappings);
    if (dtos.length === 0) {
      setIsSaving(false);
      // Quiet no-op — used by handleContinue's auto-save on a clean state.
      return true;
    }
    const result = await saveMappings(httpClient, projectId, dtos);
    if (result.ok) {
      actions.markChangesSaved();
      const { inserted, updated } = result.data;
      showSuccess('Mappings saved', `${inserted} inserted, ${updated} updated`);
      invalidateSuggestions();
      setIsSaving(false);
      return true;
    }
    showError('Save failed', result.error.message);
    setIsSaving(false);
    return false;
  }, [projectId, actions, showSuccess, showError, invalidateSuggestions]);

  const handleContinue = useCallback((): void => {
    actions.completeStep(3);
    actions.setStep(4);
    syncStep(4);
    navigateForward(projectId);
  }, [actions, syncStep, navigateForward, projectId]);

  return {
    currentStep, completedSteps, sourceFile, sourceERP, targetERP, confidenceFilter,
    confirmedHigh, confirmedMedium, confirmedLow, deletedAccounts, targetTypes,
    targetAccountNames, stats, filteredMappings, allConfirmed, errors, warnings,
    isDeletedOpen, handleStepPress, handleFilterPress, handleConfirm, handleTypeChange,
    handleAccountNameChange, handleDeleteAccount, handleRestoreAccount,
    handleToggleDeleted, handleBack, handleContinue, handleSaveMappings,
    hasUnsavedChanges, isSaving,
  };
}
