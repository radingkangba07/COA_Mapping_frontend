/* ============================================================================
   useApproval.ts  ·  The single approval gate
   ----------------------------------------------------------------------------
   Root CLAUDE.md, wizard rule #5: "Every write goes through one approval
   component." This hook is the only way a screen may turn an AI proposal or
   a user override into a FieldDecision — it never writes directly, it raises
   a request that components/ApprovalModal.tsx renders and the user confirms.
   Both call through to wizard.store, which delegates to decision.service.ts.

   describeApproval() below is entity-agnostic copy derived only from
   ApprovalContext's fields (reason/confidence/ids) — never branch on
   entityId here (wizard rule #2).
   ========================================================================= */

import { useCallback, useMemo } from 'react';
import { useWizardStore } from '../store/wizard.store';
import type { ApprovalContext } from '../types/decision.types';

export interface ApprovalCopy {
  readonly title: string;
  readonly detail: string;
}

function describeApproval(context: ApprovalContext): ApprovalCopy {
  if (context.reason === 'user-override') {
    return {
      title: 'Confirm manual target',
      detail: context.previousTargetId
        ? 'Replace the proposed target with your choice for this field. The prior proposal is kept for audit.'
        : 'Set a target for this field. Nothing is written until you confirm.',
    };
  }
  return {
    title: 'Confirm AI-proposed mapping',
    detail:
      context.confidence !== undefined
        ? `Accept this proposal (${Math.round(context.confidence)}% confidence). Nothing is written until you confirm.`
        : 'Accept this AI-proposed mapping. Nothing is written until you confirm.',
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

export function useApproval(): UseApprovalReturn {
  const pendingApproval = useWizardStore((s) => s.pendingApproval);
  const raiseApproval = useWizardStore((s) => s.raiseApproval);
  const confirmApproval = useWizardStore((s) => s.confirmApproval);
  const cancelApproval = useWizardStore((s) => s.cancelApproval);

  const copy = useMemo(
    () => (pendingApproval ? describeApproval(pendingApproval) : null),
    [pendingApproval],
  );

  const raise = useCallback(
    (context: ApprovalContext): void => raiseApproval(context),
    [raiseApproval],
  );
  const confirm = useCallback(
    (decidedBy?: string): void => confirmApproval(decidedBy),
    [confirmApproval],
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
