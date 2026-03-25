import type { MigrationStore } from './migration.store';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type { ConfidenceLevel, GroupedMapping } from '@/features/migration/types/mapping.types';
import type { UploadedFile } from '@/features/migration/types/migration.types';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';

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

// ─── File Selectors ──────────────────────────────────────────────────────────

interface UploadedFiles {
  readonly sourceFile: UploadedFile | null;
  readonly targetFile: UploadedFile | null;
  readonly mappingFile: UploadedFile | null;
}

export const selectUploadedFiles = (state: MigrationStore): UploadedFiles => ({
  sourceFile: state.sourceFile,
  targetFile: state.targetFile,
  mappingFile: state.mappingFile,
});

// ─── Type Mapping Summary ───────────────────────────────────────────────────

interface TypeMappingSummary {
  readonly total: number;
  readonly matched: number;
  readonly allMatched: boolean;
}

export const selectTypeMappingSummary = (state: MigrationStore): TypeMappingSummary => {
  const total = state.typeMappingRows.length;
  const matched = state.typeMappingRows.filter((r) => r.targetType.length > 0).length;
  return { total, matched, allMatched: total > 0 && matched === total };
};

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
  const allAccounts = state.groupedMappings.flatMap((g) => g.accounts);

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

    if (account.user_changed === true) {
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
  if (state.confidenceFilter === null) {
    return state.groupedMappings;
  }

  const filter = state.confidenceFilter;

  return state.groupedMappings
    .map((group) => ({
      ...group,
      accounts: group.accounts.filter((account) =>
        matchesConfidenceLevel(account.score, filter),
      ),
    }))
    .filter((group) => group.accounts.length > 0);
};

// ─── Confirmation Selectors ──────────────────────────────────────────────────

export const selectAllConfirmed = (state: MigrationStore): boolean =>
  state.confirmedHigh && state.confirmedMedium && state.confirmedLow;
