import type { GroupedMapping, AccountMapping } from '@/features/migration/types/mapping.types';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type { ValidationResult, ValidationIssue } from '@/features/migration/types/validation.types';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';

// Re-export types for convenience
export type { ValidationSeverity, ValidationIssue, ValidationResult } from '@/features/migration/types/validation.types';

// ─── Validation Logic ───────────────────────────────────────────────────────

/**
 * Validate grouped mappings against target ERP rules.
 * Checks: missing target names, duplicate mappings, confidence below threshold,
 * required account types not mapped.
 */
export function validateMappings(
  groupedMappings: readonly GroupedMapping[],
  targetERP: ERPSystem,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (let groupIdx = 0; groupIdx < groupedMappings.length; groupIdx++) {
    const group = groupedMappings[groupIdx];
    if (!group) continue;

    // Check: missing target type
    if (!group.target_type) {
      issues.push({
        severity: 'error',
        message: `Source type "${group.source_type}" has no target type mapping`,
        groupIndex: groupIdx,
        sourceType: group.source_type,
      });
    }

    // Track target names for duplicate detection within this group
    const targetNameCounts = new Map<string, number[]>();

    for (let accIdx = 0; accIdx < group.accounts.length; accIdx++) {
      const account: AccountMapping | undefined = group.accounts[accIdx];
      if (!account) continue;

      // Check: missing target name
      if (!account.target_name || account.target_name === 'unmatched') {
        issues.push({
          severity: 'error',
          message: `Account "${account.source_name}" (${account.source_number}) has no target mapping`,
          groupIndex: groupIdx,
          accountIndex: accIdx,
          sourceType: group.source_type,
          sourceNumber: account.source_number,
        });
      }

      // Check: confidence below threshold
      if (
        account.target_name &&
        account.target_name !== 'unmatched' &&
        account.score < CONFIDENCE_THRESHOLDS.MEDIUM
      ) {
        issues.push({
          severity: 'warning',
          message: `Account "${account.source_name}" has low confidence (${String(account.score)}%)`,
          groupIndex: groupIdx,
          accountIndex: accIdx,
          sourceType: group.source_type,
          sourceNumber: account.source_number,
        });
      }

      // Collect target names for duplicate check
      if (account.target_name && account.target_name !== 'unmatched') {
        const key = account.target_name.toLowerCase();
        const indices = targetNameCounts.get(key) ?? [];
        indices.push(accIdx);
        targetNameCounts.set(key, indices);
      }
    }

    // Check: duplicate target mappings within group
    for (const [targetName, indices] of targetNameCounts) {
      if (indices.length > 1) {
        issues.push({
          severity: 'warning',
          message: `Target "${targetName}" is mapped to ${String(indices.length)} source accounts in "${group.source_type}"`,
          groupIndex: groupIdx,
          sourceType: group.source_type,
        });
      }
    }
  }

  // Check: required account types not mapped (based on target ERP fields)
  const mappedTargetTypes = new Set(
    groupedMappings
      .filter((g) => g.target_type)
      .map((g) => g.target_type.toLowerCase()),
  );

  const requiredFields = targetERP.fields.filter((f) => f.required);
  for (const field of requiredFields) {
    if (!mappedTargetTypes.has(field.name.toLowerCase())) {
      issues.push({
        severity: 'warning',
        message: `Required target ERP field "${field.name}" has no source type mapped to it`,
        groupIndex: -1,
        sourceType: '',
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    issues,
    errorCount,
    warningCount,
    isValid: errorCount === 0,
  };
}
