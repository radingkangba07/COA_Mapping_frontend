import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import {
  selectMappingStats,
  selectFilteredMappings,
  selectAllConfirmed,
} from '../store/migration.selectors';
import { useValidation } from './useValidation';
import type { ConfidenceLevel, AccountMapping, GroupedMapping } from '../types/mapping.types';
import type { UploadedFile } from '../types/migration.types';
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
  readonly confidenceFilter: ConfidenceLevel | null;
  readonly confirmedHigh: boolean;
  readonly confirmedMedium: boolean;
  readonly confirmedLow: boolean;
  readonly deletedAccounts: readonly { sourceType: string; sourceNumber: string; sourceName: string }[];
  readonly targetTypes: readonly string[];
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
  const confidenceFilter = useMigrationStore((s) => s.confidenceFilter);
  const confirmedHigh = useMigrationStore((s) => s.confirmedHigh);
  const confirmedMedium = useMigrationStore((s) => s.confirmedMedium);
  const confirmedLow = useMigrationStore((s) => s.confirmedLow);
  const deletedAccounts = useMigrationStore((s) => s.deletedAccounts);
  const targetTypes = useMigrationStore((s) => s.targetTypes);
  const stats = useMigrationStore(selectMappingStats);
  const filteredMappings = useMigrationStore(selectFilteredMappings);
  const allConfirmed = useMigrationStore(selectAllConfirmed);

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
    currentStep, completedSteps, sourceFile, confidenceFilter,
    confirmedHigh, confirmedMedium, confirmedLow, deletedAccounts, targetTypes,
    stats, filteredMappings, allConfirmed, errors, warnings, isDeletedOpen,
    handleStepPress, handleFilterPress, handleConfirm, handleTypeChange,
    handleAccountNameChange, handleDeleteAccount, handleRestoreAccount,
    handleToggleDeleted, handleBack, handleContinue,
  };
}
