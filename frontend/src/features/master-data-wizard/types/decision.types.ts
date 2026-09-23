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
   through one approval component"). Decisions (accepted / excluded /
   overrides) still live in decisionsByEntity as the local mirror of
   server state, but confirming one now also calls the real PATCH
   column-mappings endpoint (DA-401) — not local-only persistence anymore.
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

/** Why an approval request was raised. `'exclude'` joins Accept/Retarget
 *  behind the same modal per DA-353's own text — reverses DA-376/378's
 *  earlier direct-write choice for Exclude, confirmed explicitly.
 *  `'bulk-accept'` (DA-384) covers both "Accept N high-confidence" and
 *  "Accept selected" — the write path (bulkAcceptColumnMappings) is the
 *  same regardless of which UI control raised it. */
export type ApprovalReason = 'ai-proposal' | 'user-override' | 'exclude' | 'bulk-accept';

/**
 * The payload passed to the wizard's single approval component. Save raises
 * this; it never writes directly. Confirming it is what produces a
 * FieldDecision.
 */
export interface ApprovalContext {
  entityId: EntityId;
  /** Ignored when reason === 'bulk-accept' (see bulkFields below) — kept
   *  required rather than optional so every other reason keeps its
   *  existing non-null guarantee; bulk raisers pass ''. */
  fieldId: string;
  reason: ApprovalReason;
  proposedTargetId: string | null;
  previousTargetId: string | null;
  /** Present when reason === 'ai-proposal'. */
  confidence?: number;
  /** Present only when reason === 'bulk-accept' — one entry per row being
   *  accepted in this batch. Deliberately more than the `fieldIds: string[]`
   *  DA-384's own ticket text describes: the real backend has no by-id
   *  bulk-accept endpoint, only PUT .../mappings (bulkAcceptColumnMappings),
   *  which requires resending each row's full proposal data, not just its
   *  id — see that function's doc comment. */
  bulkFields?: BulkAcceptField[];
}

/** One row's data as mapping.service.ts's bulkAcceptColumnMappings needs it
 *  — same scale/case as MappingRow (Title Case validation, 0-100
 *  confidence), so a caller with a MappingRow in hand can build this with a
 *  plain field-rename, no re-fetch. Lives here rather than in
 *  mapping.service.ts because ApprovalContext (above) needs it too, and
 *  types/ -> services/ is the wrong import direction (services/ imports
 *  from types/, never the reverse) — mapping.service.ts imports this type
 *  from here instead of defining its own copy. */
export interface BulkAcceptField {
  /** MappingRow.id — round-tripped back to the caller only for local
   *  decision-recording (wizard.store), never sent to the backend. */
  fieldId: string;
  sourceField: string;
  targetFieldId: string;
  targetFieldLabel?: string;
  targetDtype?: string;
  /** 0-100, same scale as MappingRow.conf. */
  confidence?: number;
  /** Title Case, same scale as MappingRow.validation. */
  validation?: string;
  evidence?: string[];
}
