/* ============================================================================
   useApproval.ts  ·  The single approval gate
   ----------------------------------------------------------------------------
   Root CLAUDE.md, wizard rule #5: "Every write goes through one approval
   component." This hook is the only way a screen may turn an AI proposal,
   a user override, or an exclude into a FieldDecision — it never writes
   directly, it raises a request that ApprovalModal renders and the user
   confirms. confirm() optimistically records the local decision (via
   wizard.store, unchanged), then fires the real PATCH column-mappings
   call (DA-401) in the background — rolling the local decision back and
   toasting on failure, matching DA-378's "optimistic update + rollback"
   requirement. Store stays a pure, synchronous state container; this hook
   owns the async/network/toast orchestration (Screens -> Hooks -> Store
   -> Services stays one-directional).

   describeApproval() below is entity-agnostic copy derived only from
   ApprovalContext's fields (reason/confidence/ids) — never branch on
   entityId here (wizard rule #2).
   ========================================================================= */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { patchColumnMapping, bulkAcceptColumnMappings, type PatchColumnMappingBody } from '../services/mapping.service';
import type { ApprovalContext } from '../types/decision.types';

export interface ApprovalCopy {
  readonly title: string;
  readonly detail: string;
  /** Same "Before — ... After — ..." shape as Profile's `approvalCopyFor()`
   *  — required here (not optional) so Mapping's dialog always shows the
   *  same "Preview changes" button Profile's does, per DA-378 leaving this
   *  unset when it first wired Mapping through the shared `ApprovalModal`. */
  readonly preview: string;
}

function describeApproval(context: ApprovalContext): ApprovalCopy {
  if (context.reason === 'bulk-accept') {
    const n = context.bulkFields?.length ?? 0;
    return {
      title: 'Confirm bulk accept',
      detail: `Accept ${n} mapping${n === 1 ? '' : 's'}. Nothing is written until you confirm.`,
      preview: `Before — ${n} AI-suggested mapping${n === 1 ? '' : 's'}, not yet applied.   After — all ${n} confirmed and used for the migration.`,
    };
  }
  if (context.reason === 'user-override') {
    return {
      title: 'Confirm manual target',
      detail: context.previousTargetId
        ? 'Replace the proposed target with your choice for this field. The prior proposal is kept for audit.'
        : 'Set a target for this field. Nothing is written until you confirm.',
      preview: context.previousTargetId
        ? `Before — mapped to "${context.previousTargetId}".   After — mapped to "${context.proposedTargetId}". The prior proposal is kept for audit.`
        : `Before — no target set for this field.   After — mapped to "${context.proposedTargetId}".`,
    };
  }
  if (context.reason === 'exclude') {
    return {
      title: 'Confirm exclude field',
      detail: 'Exclude this field from the migration. Nothing is written until you confirm.',
      preview: 'Before — included in the migration.   After — excluded from all mappings and validation.',
    };
  }
  return {
    title: 'Confirm AI-proposed mapping',
    detail:
      context.confidence !== undefined
        ? `Accept this proposal (${Math.round(context.confidence)}% confidence). Nothing is written until you confirm.`
        : 'Accept this AI-proposed mapping. Nothing is written until you confirm.',
    preview:
      context.confidence !== undefined
        ? `Before — AI-suggested mapping (${Math.round(context.confidence)}% confidence), not yet applied.   After — mapping confirmed and used for the migration.`
        : 'Before — AI-suggested mapping, not yet applied.   After — mapping confirmed and used for the migration.',
  };
}

export interface UseApprovalReturn {
  readonly pendingApproval: ApprovalContext | null;
  readonly isOpen: boolean;
  readonly copy: ApprovalCopy | null;
  /** Raise a request. Does not write — see confirm(). */
  readonly raise: (context: ApprovalContext) => void;
  /** The one point where a request becomes a FieldDecision. */
  readonly confirm: (decidedBy?: string) => void;
  readonly cancel: () => void;
}

function toPatchBody(context: ApprovalContext): PatchColumnMappingBody {
  // Accept and Retarget both resolve to the same write server-side — a
  // non-null target_field_id confirms the row (status becomes "confirmed"
  // either way); Exclude sends null. There is no accepted-vs-overridden
  // distinction at this layer (see mapping.service.ts's doc comment).
  return { target_field_id: context.reason === 'exclude' ? null : (context.proposedTargetId ?? null) };
}

export function useApproval(): UseApprovalReturn {
  const pendingApproval = useWizardStore((s) => s.pendingApproval);
  const raiseApproval = useWizardStore((s) => s.raiseApproval);
  const confirmApproval = useWizardStore((s) => s.confirmApproval);
  const cancelApproval = useWizardStore((s) => s.cancelApproval);
  const clearFieldDecision = useWizardStore((s) => s.clearFieldDecision);
  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  // Keyed by project+entity (see wizard.store.ts's buildEntityKey) — same
  // convention setPipelineRunId itself writes with.
  const pipelineRunId = useWizardStore((s) =>
    pendingApproval ? s.pipelineRunIdByEntity[buildEntityKey(parentProjectId ?? '', pendingApproval.entityId)] : undefined,
  );
  const toast = useToast();
  const queryClient = useQueryClient();

  const copy = useMemo(
    () => (pendingApproval ? describeApproval(pendingApproval) : null),
    [pendingApproval],
  );

  const raise = useCallback(
    (context: ApprovalContext): void => raiseApproval(context),
    [raiseApproval],
  );

  const confirm = useCallback(
    (decidedBy?: string): void => {
      if (!pendingApproval) return;
      const context = pendingApproval;
      confirmApproval(decidedBy);

      // No pipeline run yet for this entity (DA-401's own prerequisite) —
      // stays a purely local decision, same as before this feature existed.
      if (!pipelineRunId) return;

      if (context.reason === 'bulk-accept' && context.bulkFields) {
        const bulkFields = context.bulkFields;
        bulkAcceptColumnMappings(httpClient, pipelineRunId, bulkFields).then((result) => {
          if (!result.ok) {
            for (const bulkField of bulkFields) clearFieldDecision(context.entityId, bulkField.fieldId);
            toast.showError('Could not save these changes', result.error.message);
            return;
          }
          void queryClient.invalidateQueries({ queryKey: ['column-mappings', context.entityId] });
        });
        return;
      }

      patchColumnMapping(httpClient, pipelineRunId, context.fieldId, toPatchBody(context)).then((result) => {
        if (!result.ok) {
          clearFieldDecision(context.entityId, context.fieldId);
          toast.showError('Could not save this change', result.error.message);
          return;
        }
        void queryClient.invalidateQueries({ queryKey: ['column-mappings', context.entityId] });
      });
    },
    [pendingApproval, confirmApproval, pipelineRunId, clearFieldDecision, toast, queryClient],
  );

  const cancel = useCallback((): void => cancelApproval(), [cancelApproval]);

  return {
    pendingApproval,
    isOpen: pendingApproval !== null,
    copy,
    raise,
    confirm,
    cancel,
  };
}
