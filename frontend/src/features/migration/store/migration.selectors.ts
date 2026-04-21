import type { MigrationStore } from './migration.store';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type { UploadedFile } from '@/features/migration/types/migration.types';
import type { ConfidenceLevel, GroupedMapping } from '@/features/migration/types/mapping.types';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';

// ─── File Selectors (respect pending removals) ─────────────────────────────

export const selectEffectiveSourceFile = (state: MigrationStore): UploadedFile | null =>
  state.pendingSourceRemoval ? null : state.sourceFile;

export const selectEffectiveTargetFile = (state: MigrationStore): UploadedFile | null =>
  state.pendingTargetRemoval ? null : state.targetFile;

export const selectEffectiveMappingFile = (state: MigrationStore): UploadedFile | null =>
  state.pendingMappingRemoval ? null : state.mappingFile;

// ─── Step Selectors ──────────────────────────────────────────────────────────

export const selectCurrentStep = (state: MigrationStore): number =>
  state.currentStep;

export const selectCanProceed = (state: MigrationStore): boolean =>
  state.completedSteps.includes(state.currentStep);

// ─── ERP Selectors ───────────────────────────────────────────────────────────

export const selectSourceERP = (state: MigrationStore): ERPSystem | null =>
  state.sourceERP;

export const selectTargetERP = (state: MigrationStore): ERPSystem | null =>
  state.targetERP;

// ─── Type Mapping Summary ───────────────────────────────────────────────────

interface TypeMappingSummary {
  readonly total: number;
  readonly matched: number;
  readonly allMatched: boolean;
}

export const selectTypeMappingSummary = (state: MigrationStore): TypeMappingSummary => {
  const total = state.typeMappingRows.length;
  const matched = state.typeMappingRows.filter((r) => r.targetTypes.length > 0).length;
  return { total, matched, allMatched: total > 0 && matched === total };
};

export const selectHasUnsavedTypeMappings = (state: MigrationStore): boolean =>
  state.hasUnsavedTypeMappings;

// ─── Mapping Stats ───────────────────────────────────────────────────────────

export interface MappingStats {
  readonly totalTypes: number;
  readonly totalAccounts: number;
  readonly highConfidence: number;
  readonly mediumConfidence: number;
  readonly lowConfidence: number;
  readonly confirmedCount: number;
}

export const selectMappingStats = (state: MigrationStore): MappingStats => {
  const allAccounts = state.groupedMappings
    .flatMap((g) => g.accounts)
    .filter((a) => a.is_active !== false);

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let confirmedCount = 0;

  for (const account of allAccounts) {
    if (account.score >= CONFIDENCE_THRESHOLDS.HIGH) {
      highConfidence += 1;
    } else if (account.score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
      mediumConfidence += 1;
    } else {
      lowConfidence += 1;
    }

    const isConfirmedByBand =
      (account.score >= CONFIDENCE_THRESHOLDS.HIGH && state.confirmedHigh) ||
      (account.score >= CONFIDENCE_THRESHOLDS.MEDIUM && account.score < CONFIDENCE_THRESHOLDS.HIGH && state.confirmedMedium) ||
      (account.score < CONFIDENCE_THRESHOLDS.MEDIUM && state.confirmedLow);

    if (account.user_changed === true || isConfirmedByBand) {
      confirmedCount += 1;
    }
  }

  return {
    totalTypes: state.groupedMappings.length,
    totalAccounts: allAccounts.length,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    confirmedCount,
  };
};

// ─── Filtered Mappings ───────────────────────────────────────────────────────

function matchesConfidenceLevel(
  score: number,
  level: ConfidenceLevel,
): boolean {
  switch (level) {
    case 'high':
      return score >= CONFIDENCE_THRESHOLDS.HIGH;
    case 'medium':
      return (
        score >= CONFIDENCE_THRESHOLDS.MEDIUM &&
        score < CONFIDENCE_THRESHOLDS.HIGH
      );
    case 'low':
      return score < CONFIDENCE_THRESHOLDS.MEDIUM;
  }
}

export const selectFilteredMappings = (
  state: MigrationStore,
): GroupedMapping[] => {
  const filter = state.confidenceFilter;
  return state.groupedMappings
    .map((group) => ({
      ...group,
      accounts: group.accounts.filter((account) => {
        if (account.is_active === false) return false;
        if (filter === null) return true;
        return matchesConfidenceLevel(account.score, filter);
      }),
    }))
    .filter((group) => group.accounts.length > 0);
};

// ─── Deleted Accounts (derived) ─────────────────────────────────────────────

export interface DeletedAccountEntry {
  readonly sourceType: string;
  readonly sourceNumber: string;
  readonly sourceName: string;
}

export const selectDeletedAccounts = (
  state: MigrationStore,
): DeletedAccountEntry[] => {
  const out: DeletedAccountEntry[] = [];
  for (const group of state.groupedMappings) {
    for (const account of group.accounts) {
      if (account.is_active === false) {
        out.push({
          sourceType: group.source_type,
          sourceNumber: account.source_number,
          sourceName: account.source_name,
        });
      }
    }
  }
  return out;
};

// ─── Confirmation Selectors ──────────────────────────────────────────────────

export const selectAllConfirmed = (state: MigrationStore): boolean =>
  state.confirmedHigh && state.confirmedMedium && state.confirmedLow;
