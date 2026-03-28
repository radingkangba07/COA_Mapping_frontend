import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import {
  selectMappingStats,
  selectAllConfirmed,
} from '../store/migration.selectors';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';
import { useValidation } from './useValidation';
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
  readonly handleConfirm: (level: ConfidenceLevel) => void;
  readonly handleTypeChange: (sourceType: string, newTargetType: string) => void;
  readonly handleAccountNameChange: (sourceType: string, accountIndex: number, newName: string) => void;
  readonly handleDeleteAccount: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  readonly handleRestoreAccount: (deletedIndex: number) => void;
  readonly handleToggleDeleted: () => void;
  readonly handleBack: () => void;
  readonly handleContinue: () => void;
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
  const confidenceFilter = useMigrationStore((s) => s.confidenceFilter);
  const confirmedHigh = useMigrationStore((s) => s.confirmedHigh);
  const confirmedMedium = useMigrationStore((s) => s.confirmedMedium);
  const confirmedLow = useMigrationStore((s) => s.confirmedLow);
  const deletedAccounts = useMigrationStore((s) => s.deletedAccounts);
  const targetTypes = useMigrationStore((s) => s.targetTypes);
  const stats = useMigrationStore(useShallow(selectMappingStats));
  const allConfirmed = useMigrationStore(selectAllConfirmed);

  const filteredMappings = useMemo(() => {
    if (confidenceFilter === null) return groupedMappings;
    const thresholds = { high: CONFIDENCE_THRESHOLDS.HIGH, medium: CONFIDENCE_THRESHOLDS.MEDIUM };
    return groupedMappings
      .map((group) => ({
        ...group,
        accounts: group.accounts.filter((a) => {
          if (confidenceFilter === 'high') return a.score >= thresholds.high;
          if (confidenceFilter === 'medium') return a.score >= thresholds.medium && a.score < thresholds.high;
          return a.score < thresholds.medium;
        }),
      }))
      .filter((group) => group.accounts.length > 0);
  }, [groupedMappings, confidenceFilter]);

  const actions = useMigrationStore(useShallow((s) => ({
    setStep: s.setStep,
    completeStep: s.completeStep,
    setConfidenceFilter: s.setConfidenceFilter,
    confirmConfidenceLevel: s.confirmConfidenceLevel,
    updateTypeMapping: s.updateTypeMapping,
    updateAccountName: s.updateAccountName,
    deleteAccount: s.deleteAccount,
    restoreAccount: s.restoreAccount,
  })));

  const { errors, warnings } = useValidation();
  const [isDeletedOpen, setIsDeletedOpen] = useState(false);

  const targetAccountNames = useMemo<string[]>(() => {
    const names = new Set<string>();
    for (const group of groupedMappings) {
      for (const account of group.accounts) {
        if (account.target_name && account.target_name.length > 0) {
          names.add(account.target_name);
        }
      }
    }
    return Array.from(names).sort();
  }, [groupedMappings]);

  const handleStepPress = useCallback(
    (step: number): void => { actions.setStep(step); }, [actions]);
  const handleFilterPress = useCallback(
    (filter: ConfidenceLevel | null): void => { actions.setConfidenceFilter(filter); }, [actions]);
  const handleConfirm = useCallback(
    (level: ConfidenceLevel): void => { actions.confirmConfidenceLevel(level); }, [actions]);
  const handleTypeChange = useCallback(
    (sourceType: string, newTargetType: string): void => { actions.updateTypeMapping(sourceType, newTargetType); }, [actions]);
  const handleAccountNameChange = useCallback(
    (sourceType: string, accountIndex: number, newName: string): void => {
      actions.updateAccountName(sourceType, accountIndex, newName, 'User');
    }, [actions]);
  const handleDeleteAccount = useCallback(
    (sourceType: string, accountIndex: number, _account: AccountMapping): void => {
      actions.deleteAccount(sourceType, accountIndex);
    }, [actions]);
  const handleRestoreAccount = useCallback(
    (deletedIndex: number): void => { actions.restoreAccount(deletedIndex); }, [actions]);
  const handleToggleDeleted = useCallback(
    (): void => { setIsDeletedOpen((prev) => !prev); }, []);
  const handleBack = useCallback((): void => {
    actions.setStep(2);
    navigateBack(projectId);
  }, [actions, navigateBack, projectId]);
  const handleContinue = useCallback((): void => {
    actions.completeStep(3);
    actions.setStep(4);
    navigateForward(projectId);
  }, [actions, navigateForward, projectId]);

  return {
    currentStep, completedSteps, sourceFile, sourceERP, targetERP, confidenceFilter,
    confirmedHigh, confirmedMedium, confirmedLow, deletedAccounts, targetTypes,
    targetAccountNames, stats, filteredMappings, allConfirmed, errors, warnings,
    isDeletedOpen, handleStepPress, handleFilterPress, handleConfirm, handleTypeChange,
    handleAccountNameChange, handleDeleteAccount, handleRestoreAccount,
    handleToggleDeleted, handleBack, handleContinue,
  };
}
