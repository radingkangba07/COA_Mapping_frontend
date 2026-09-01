import type { ApprovalKind, Decision } from '../store/sourceProfile.store';

export interface DecisionState {
  readonly confirmed: boolean;
  readonly ignored: boolean;
  readonly confirmDecisionId: string | null;
  readonly ignoreDecisionId: string | null;
}

/**
 * `pack.fields` (from useEntityPack) is never mutated to hold a
 * confirmed/ignored flag directly — effective status is always derived
 * from the decisions log instead, since the pack is read-only query data.
 */
export function decisionStateFor(fieldId: string, decisions: readonly Decision[]): DecisionState {
  const confirmDecision = decisions.find((d) => d.fieldId === fieldId && d.kind === 'confirm');
  const ignoreDecision = decisions.find((d) => d.fieldId === fieldId && d.kind === 'ignore');
  return {
    confirmed: confirmDecision !== undefined,
    ignored: ignoreDecision !== undefined,
    confirmDecisionId: confirmDecision?.id ?? null,
    ignoreDecisionId: ignoreDecision?.id ?? null,
  };
}

/**
 * Only these two `field.actions[].id` values are migration-config writes
 * that must go through the approval modal. Every other action id present
 * in the fixtures (records, previewInfer, previewNorm, valueMapping,
 * composite, reviewDup, fieldMapping) is navigation/preview, not a write,
 * and is intentionally absent here.
 */
export const ACTION_ID_TO_KIND: Readonly<Record<string, ApprovalKind>> = {
  confirmId: 'confirm',
  ignore: 'ignore',
};
