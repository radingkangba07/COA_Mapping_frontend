/* ============================================================================
   decision.service.ts  ·  Local-only field-decision operations
   ----------------------------------------------------------------------------
   There is no write endpoint yet (root CLAUDE.md, "master-data wizard
   (dp-kit) rules" #5: "There is no write endpoint yet. Keep decisions
   (accepted / excluded / overrides) in the feature's zustand store and raise
   the endpoint question; do not invent a route."). Every function here is a
   pure, synchronous operation over local FieldDecision state — none of them
   call the network.

   When a real persistence endpoint is confirmed, wrap these with an
   HTTP-calling function the same way entity-pack.service.ts wraps its GET
   (HttpClient in, Result<T, AppError> out, zod-validated response). Do not
   fold persistence into these functions until that endpoint exists.
   ========================================================================= */

import type { FieldDecision, MappingOverrides } from '../types/decision.types';

/** Upsert one decision, replacing any prior decision for the same field. */
export function recordDecision(
  decisions: FieldDecision[],
  next: FieldDecision,
): FieldDecision[] {
  return [...decisions.filter((d) => d.fieldId !== next.fieldId), next];
}

/** Remove a field's decision entirely — e.g. undo, or reset to the AI proposal. */
export function clearDecision(
  decisions: FieldDecision[],
  fieldId: string,
): FieldDecision[] {
  return decisions.filter((d) => d.fieldId !== fieldId);
}

/** Look up the current decision for one field, if any. */
export function getDecision(
  decisions: FieldDecision[],
  fieldId: string,
): FieldDecision | null {
  return decisions.find((d) => d.fieldId === fieldId) ?? null;
}

/**
 * Derive the fieldId -> targetId map from decisions with status
 * 'overridden'. This is the MappingOverrides shape root CLAUDE.md describes
 * as stored separately from the pack — never fold it back into
 * pack.mapping.proposals; that destroys the audit trail.
 */
export function buildOverrides(decisions: FieldDecision[]): MappingOverrides {
  return decisions.reduce<MappingOverrides>((acc, decision) => {
    if (decision.status === 'overridden' && decision.targetId) {
      acc[decision.fieldId] = decision.targetId;
    }
    return acc;
  }, {});
}
