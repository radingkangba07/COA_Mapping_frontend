import type { ApprovalKind } from '../store/sourceProfile.store';
import type { EntityField } from '../dp-kit/types/entity';
import { pctOf } from './fields';

export interface ApprovalCopy {
  readonly title: string;
  readonly detail: string;
  readonly preview: string;
  /** Final copy stored on the Decision once applied, e.g. "Ignored SKU". */
  readonly decisionLabel: string;
}

/** Matches the reference's own openApproval/pendingApproval copy verbatim. */
export function approvalCopyFor(field: EntityField, kind: ApprovalKind, rowCount: number): ApprovalCopy {
  if (kind === 'confirm') {
    return {
      title: `Confirm ${field.name} as identifier`,
      detail: 'Sets the migration key (Odoo default_code)',
      preview: `Before — inferred identifier candidate (${field.confidence ?? 0}% confidence).   After — user-confirmed identifier.`,
      decisionLabel: `Confirmed ${field.name} as identifier`,
    };
  }
  const populated = rowCount - (field.nullCount ?? 0);
  return {
    title: `Ignore ${field.name}`,
    detail: `${pctOf(populated, rowCount)} populated`,
    preview: 'Before — included in the migration.   After — excluded from all mappings and validation.',
    decisionLabel: `Ignored ${field.name}`,
  };
}
