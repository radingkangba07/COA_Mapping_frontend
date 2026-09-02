/* ============================================================================
   decision.types.ts  ·  Human decisions on a proposed field mapping
   ----------------------------------------------------------------------------
   Separate from entity-pack.types.ts on purpose: an EntityPack is what the
   profiler produced; a decision is what a person decided. Never fold one of
   these back into the pack's `mapping.proposals` — that destroys the audit
   trail and lets a re-profile silently overwrite a human decision.

   FieldDecision and ApprovalContext are not specified anywhere in dp-kit or
   docs/handover — they are this app's own addition, written to satisfy root
   CLAUDE.md, "master-data wizard (dp-kit) rules" #5 ("every write goes
   through one approval component") and the note that decisions (accepted /
   excluded / overrides) live in the feature's zustand store, not a backend
   route — there is no write endpoint yet.
   ========================================================================= */

import type { EntityId } from './entity-pack.types';

/** Already part of the generated contract — re-exported, not redefined. */
export type { MappingOverrides, RetargetRequest } from '../dp-kit/types/entity';

/** What a user decided about one source field's proposed mapping. */
export type FieldDecisionStatus = 'accepted' | 'excluded' | 'overridden';

export interface FieldDecision {
  fieldId: string;
  status: FieldDecisionStatus;
  /** Set only when status === 'overridden' — the target the user picked. */
  targetId?: string;
  /** What the profiler had proposed, kept for audit. */
  previousTargetId?: string;
  /** ISO timestamp. */
  decidedAt: string;
  decidedBy?: string;
}

/** Why an approval request was raised. */
export type ApprovalReason = 'ai-proposal' | 'user-override';

/**
 * The payload passed to the wizard's single approval component. Save raises
 * this; it never writes directly. Confirming it is what produces a
 * FieldDecision.
 */
export interface ApprovalContext {
  entityId: EntityId;
  fieldId: string;
  reason: ApprovalReason;
  proposedTargetId: string | null;
  previousTargetId: string | null;
  /** Present when reason === 'ai-proposal'. */
  confidence?: number;
}
