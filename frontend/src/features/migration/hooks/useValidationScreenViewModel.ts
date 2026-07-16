import { useCallback, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQueryClient } from '@tanstack/react-query';
import { useMigrationStore } from '../store/migration.store';
import {
  selectMappingStats,
  selectAllConfirmed,
  applyConfidenceFilter,
  computeTriState,
  type TriState,
} from '../store/migration.selectors';
import { selectionKey } from '../utils/selection.utils';
import { useSyncStep } from './useSyncStep';
import { useValidation } from './useValidation';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirm } from '@/shared/hooks/useConfirm';
import {
  saveMappings,
  toMappingCreateDTOs,
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
  readonly targetAccounts: readonly { name: string; number: string }[];
  readonly stats: MappingStats;
  readonly filteredMappings: GroupedMapping[];
  readonly allConfirmed: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly isDeletedOpen: boolean;
  readonly handleStepPress: (step: number) => void;
  readonly handleFilterPress: (filter: ConfidenceLevel | null) => void;
  readonly handleConfirm: (level: ConfidenceLevel) => Promise<void>;
  readonly handleResetBand: (level: ConfidenceLevel) => void;
  readonly handleTypeChange: (sourceType: string, newTargetType: string) => void;
  readonly handleAccountNameChange: (sourceType: string, accountIndex: number, newName: string, sourceName?: string, suggestionId?: string, targetNumber?: string | null) => void;
  readonly handleDeleteAccount: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  readonly handleRestoreAccount: (deletedIndex: number) => void;
  readonly handleToggleDeleted: () => void;
  readonly handleBack: () => void;
  readonly handleContinue: () => Promise<void>;
  readonly handleSaveMappings: () => Promise<boolean>;
  readonly hasUnsavedChanges: boolean;
  readonly isSaving: boolean;
  // ─── Selection ──────────────────────────────────────────────────────────────
  readonly selection: Record<string, true>;
  readonly lockedKeys: Record<string, true>;
  readonly isMasterLocked: boolean;
  readonly masterTriState: TriState;
  readonly selectedCount: number;
  readonly handleToggleRow: (sourceType: string, account: AccountMapping) => void;
  readonly handleToggleGroup: (sourceType: string, checked: boolean, groupKeys: string[]) => void;
  readonly handleToggleMaster: (checked: boolean) => void;
  readonly handleBulkDelete: () => void;
  readonly handleClearSelection: () => void;
  readonly handleReviewSave: () => void;
  // ─── No-selection confirm guard ──────────────────────────────────────────
  readonly noSelectionDialogVisible: boolean;
  readonly noSelectionDialogOptions: { title: string; message: string; confirmText?: string; cancelText?: string } | null;
  readonly handleNoSelectionDialogConfirm: () => void;
  readonly handleNoSelectionDialogCancel: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useValidationScreenViewModel(
  projectId: string,
  navigateBack: (projectId: string) => void,
  navigateForward: (projectId: string) => void,
  navigateToFinalPreview: (projectId: string) => void,
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
  const selection = useMigrationStore((s) => s.selection);
  const stats = useMigrationStore(useShallow(selectMappingStats));
  const allConfirmed = useMigrationStore(selectAllConfirmed);

  // A band locks in FULL once it's confirmed at all — not just the accounts
  // the user happened to check. Otherwise a partial confirm leaves the
  // unchecked rows freely selectable, letting the user quietly drift the
  // band out of sync with what "Confirm ... Score" actually recorded.
  // Editing is only re-opened by "Edit & Reconfirm" (which flips
  // confirmedHigh/Medium/Low back to false).
  const lockedKeys = useMemo<Record<string, true>>(() => {
    const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;
    const locked: Record<string, true> = {};
    for (const group of groupedMappings) {
      for (const account of group.accounts) {
        if (account.is_active === false) continue;
        const s = Math.round(account.score);
        const bandConfirmed =
          (s >= HIGH && confirmedHigh) ||
          (s >= MEDIUM && s < HIGH && confirmedMedium) ||
          (s < MEDIUM && confirmedLow);
        if (bandConfirmed) {
          locked[selectionKey(group.source_type, account)] = true;
        }
      }
    }
    return locked;
  }, [groupedMappings, confirmedHigh, confirmedMedium, confirmedLow]);

  // Derived lists live here (not as store selectors) so their referential
  // identity only changes when their real deps change — otherwise useShallow
  // trips the subscription every render (new arrays/objects each call).
  const filteredMappings = useMemo(
    () => applyConfidenceFilter(groupedMappings, confidenceFilter),
    [groupedMappings, confidenceFilter],
  );

  const visibleKeysByGroup = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const g of filteredMappings) {
      const compositeKey = `${g.source_type}__${g.target_type}`;
      map[compositeKey] = g.accounts.map((a) => selectionKey(g.source_type, a));
    }
    return map;
  }, [filteredMappings]);

  const allVisibleKeys = useMemo(
    () => Object.values(visibleKeysByGroup).flat(),
    [visibleKeysByGroup],
  );

  const masterTriState = useMemo(
    () => computeTriState(selection, allVisibleKeys),
    [selection, allVisibleKeys],
  );

  const isMasterLocked = useMemo(
    () => allVisibleKeys.length > 0 && allVisibleKeys.every((k) => lockedKeys[k]),
    [allVisibleKeys, lockedKeys],
  );

  // Excludes locked (already-confirmed) keys — the selection bar and its
  // Clear/Delete actions are for pending picks, not confirmed rows.
  const selectedCount = useMemo(
    () => Object.keys(selection).filter((k) => !lockedKeys[k]).length,
    [selection, lockedKeys],
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
    toggleAccountSelection: s.toggleAccountSelection,
    setSelectionForKeys: s.setSelectionForKeys,
    clearSelection: s.clearSelection,
    bulkDeleteSelected: s.bulkDeleteSelected,
    confirmAccountsByKeys: s.confirmAccountsByKeys,
    resetBandConfirmation: s.resetBandConfirmation,
  })));

  const syncStep = useSyncStep();
  const { errors, warnings } = useValidation();
  const { showSuccess, showError } = useToast();
  const {
    confirm: confirmNoSelection,
    isVisible: noSelectionDialogVisible,
    confirmOptions: noSelectionDialogOptions,
    onConfirm: handleNoSelectionDialogConfirm,
    onCancel: handleNoSelectionDialogCancel,
  } = useConfirm();
  const queryClient = useQueryClient();
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const invalidateSuggestions = useCallback((): void => {
    void queryClient.invalidateQueries({
      queryKey: ['mapping-suggestions', projectId],
    });
  }, [queryClient, projectId]);

  const targetAccounts = useMemo<{ name: string; number: string }[]>(() => {
    const firstRow = targetData[0];
    if (!firstRow) return [];
    const keys = Object.keys(firstRow);
    const nameCol = keys.find(
      (k) => k.toLowerCase().includes('name') || k.toLowerCase().includes('title'),
    );
    const numberCol = keys.find(
      (k) => k.toLowerCase().includes('number') || k.toLowerCase().includes('code') || k.toLowerCase().includes('account_id'),
    );
    if (!nameCol) return [];
    const seen = new Set<string>();
    return targetData
      .map((r) => ({
        name: String(r[nameCol] ?? '').trim(),
        number: numberCol ? String(r[numberCol] ?? '').trim() : '',
      }))
      .filter(({ name }) => {
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [targetData]);

  const handleToggleRow = useCallback(
    (sourceType: string, account: AccountMapping): void => {
      // Confirmed accounts are locked — only "Edit & Reconfirm" (resetBandConfirmation)
      // can unlock them for re-selection.
      if (lockedKeys[selectionKey(sourceType, account)]) return;
      actions.toggleAccountSelection(sourceType, account);
    },
    [actions, lockedKeys],
  );

  const handleToggleGroup = useCallback(
    (_sourceType: string, checked: boolean, groupKeys: string[]): void => {
      const toggleableKeys = groupKeys.filter((k) => !lockedKeys[k]);
      actions.setSelectionForKeys(toggleableKeys, checked);
    },
    [actions, lockedKeys],
  );

  const handleToggleMaster = useCallback(
    (checked: boolean): void => {
      const toggleableKeys = allVisibleKeys.filter((k) => !lockedKeys[k]);
      actions.setSelectionForKeys(toggleableKeys, checked);
    },
    [actions, allVisibleKeys, lockedKeys],
  );

  const handleBulkDelete = useCallback(
    (): void => { actions.bulkDeleteSelected(); },
    [actions],
  );

  const handleClearSelection = useCallback(
    (): void => { actions.clearSelection(); },
    [actions],
  );

  const handleStepPress = useCallback(
    (step: number): void => { actions.setStep(step); }, [actions]);
  const handleFilterPress = useCallback(
    (filter: ConfidenceLevel | null): void => {
      setLocalFilter(filter);
      actions.setConfidenceFilter(filter);
    }, [actions]);
  const handleConfirm = useCallback(
    async (_level: ConfidenceLevel): Promise<void> => {
      const selectedKeys = Object.keys(selection);
      const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;
      const inBandKeys: string[] = [];
      let hasInBandSelection = false;

      for (const group of groupedMappings) {
        for (const account of group.accounts) {
          if (account.is_active === false) continue;
          const s = Math.round(account.score);
          const inBand =
            (_level === 'high' && s >= HIGH) ||
            (_level === 'medium' && s >= MEDIUM && s < HIGH) ||
            (_level === 'low' && s < MEDIUM);
          if (!inBand) continue;
          const k = selectionKey(group.source_type, account);
          inBandKeys.push(k);
          if (selectedKeys.includes(k)) hasInBandSelection = true;
        }
      }

      if (inBandKeys.length === 0) {
        const levelLabel = _level.charAt(0).toUpperCase() + _level.slice(1);
        await confirmNoSelection({
          title: 'No Accounts to Confirm',
          message: `There are no ${levelLabel.toLowerCase()} score accounts to confirm.`,
        });
        return;
      }

      // No rows checked → treat it as "confirm all" for this band.
      // Otherwise confirm exactly what's checked.
      const keysToConfirm = hasInBandSelection ? selectedKeys : inBandKeys;
      actions.confirmAccountsByKeys(_level, keysToConfirm);
      const levelLabel = _level.charAt(0).toUpperCase() + _level.slice(1);
      showSuccess('Confirmed', `${levelLabel} accounts confirmed`);

      // Advance the workstream sub-stage so progress % updates immediately.
      // High → enters sub-stage 2 (+10%), Medium → enters sub-stage 3 (+10%),
      // Low → advances to Preview & Export (+10% = 90%). The backend guard
      // prevents regression if the user re-confirms an already-passed band.
      const nextStage: Record<ConfidenceLevel, string> = {
        high: 'Account Mapping: 2',
        medium: 'Account Mapping: 3',
        low: 'Preview & Export',
      };
      const { workstreamId: wsId, projectId: storedPid } = useMigrationStore.getState();
      if (wsId && storedPid) {
        httpClient
          .patch(`/api/v1/projects/${storedPid}/workstreams/${wsId}`, {
            current_stage: nextStage[_level],
          })
          .catch(() => {});
      }
    }, [actions, showSuccess, selection, groupedMappings, confirmNoSelection]);

  const handleResetBand = useCallback(
    (_level: ConfidenceLevel): void => {
      actions.resetBandConfirmation(_level);
    },
    [actions],
  );
  const handleTypeChange = useCallback(
    (sourceType: string, newTargetType: string): void => { actions.updateTypeMapping(sourceType, newTargetType); }, [actions]);
  const handleAccountNameChange = useCallback(
    (sourceType: string, accountIndex: number, newName: string, sourceName?: string, suggestionId?: string, targetNumber?: string | null): void => {
      actions.updateAccountName(sourceType, accountIndex, newName, 'User', sourceName, suggestionId, targetNumber);
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

  const handleReviewSave = useCallback((): void => {
    navigateToFinalPreview(projectId);
  }, [navigateToFinalPreview, projectId]);

  const handleContinue = useCallback(async (): Promise<void> => {
    const saved = await handleSaveMappings();
    if (!saved) return;

    actions.completeStep(3);
    actions.setStep(4);
    syncStep(4);

    const { workstreamId, projectId: storedProjectId } = useMigrationStore.getState();
    if (workstreamId && storedProjectId) {
      httpClient
        .patch(`/api/v1/projects/${storedProjectId}/workstreams/${workstreamId}`, {
          current_stage: 'Preview & Export',
        })
        .catch(() => {});
    }

    navigateForward(projectId);
  }, [actions, syncStep, navigateForward, projectId, handleSaveMappings]);

  return {
    currentStep, completedSteps, sourceFile, sourceERP, targetERP, confidenceFilter,
    confirmedHigh, confirmedMedium, confirmedLow, deletedAccounts, targetTypes,
    targetAccounts, stats, filteredMappings, allConfirmed, errors, warnings,
    isDeletedOpen, handleStepPress, handleFilterPress, handleConfirm, handleResetBand, handleTypeChange,
    handleAccountNameChange, handleDeleteAccount, handleRestoreAccount,
    handleToggleDeleted, handleBack, handleContinue, handleSaveMappings,
    hasUnsavedChanges, isSaving,
    selection, lockedKeys, isMasterLocked, masterTriState, selectedCount,
    handleToggleRow, handleToggleGroup, handleToggleMaster,
    handleBulkDelete, handleClearSelection, handleReviewSave,
    noSelectionDialogVisible,
    noSelectionDialogOptions,
    handleNoSelectionDialogConfirm,
    handleNoSelectionDialogCancel,
  };
}
