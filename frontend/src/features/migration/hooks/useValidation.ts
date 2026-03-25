import { useMemo } from 'react';
import { useMigrationStore } from '@/features/migration/store/migration.store';
import { validateMappings } from '@/features/migration/services/validation.service';
import type { ValidationIssue, ValidationResult } from '@/features/migration/types/validation.types';

// ─── Return Type ─────────────────────────────────────────────────────────────

interface UseValidationReturn {
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly isValid: boolean;
}

// ─── Empty Result ────────────────────────────────────────────────────────────

const EMPTY_RESULT: ValidationResult = {
  issues: [],
  errorCount: 0,
  warningCount: 0,
  isValid: true,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useValidation(): UseValidationReturn {
  const groupedMappings = useMigrationStore((s) => s.groupedMappings);
  const targetERP = useMigrationStore((s) => s.targetERP);

  const validationResult = useMemo((): ValidationResult => {
    if (groupedMappings.length === 0 || targetERP === null) {
      return EMPTY_RESULT;
    }
    return validateMappings(groupedMappings, targetERP);
  }, [groupedMappings, targetERP]);

  const errors = useMemo(
    () => validationResult.issues.filter((i) => i.severity === 'error'),
    [validationResult.issues],
  );

  const warnings = useMemo(
    () => validationResult.issues.filter((i) => i.severity === 'warning'),
    [validationResult.issues],
  );

  return {
    errors,
    warnings,
    isValid: validationResult.isValid,
  };
}
