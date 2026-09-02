/* ============================================================================
   wizard.store.ts  ·  Master-data wizard state — decisions, step nav, approval
   ----------------------------------------------------------------------------
   Root CLAUDE.md, "master-data wizard (dp-kit) rules":
     #5 "Every write goes through one approval component ... There is no
     write endpoint yet. Keep decisions (accepted / excluded / overrides) in
     the feature's zustand store and raise the endpoint question; do not
     invent a route."

   This store is that home. It never writes to the network — every action
   here mutates local state only, via the pure helpers in
   ../services/decision.service.ts (recordDecision / clearDecision).

   Decisions are keyed by EntityId because entityId is a route parameter and
   a user can navigate between the 8 objects in one session; keeping a flat
   FieldDecision[] would let two objects' field ids collide.

   Accepting an AI proposal or retargeting it (override) are both writes of
   an ai-sourced value, so both go through raiseApproval -> confirmApproval
   (rule #4: "If a number cannot be recomputed by the profiler, it must not
   render as fact"; an ai proposal must not silently become state). Excluding
   a field is not writing an ai value — it is a direct action.
   ========================================================================= */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { StepId, RunState } from '../types/wizard.types';
import type { EntityId } from '../types/entity-pack.types';
import type {
  FieldDecision,
  FieldDecisionStatus,
  ApprovalContext,
} from '../types/decision.types';
import type { UploadResult } from '../types/upload.types';
import { recordDecision, clearDecision } from '../services/decision.service';

// ─── State ──────────────────────────────────────────────────────────────────

interface WizardState {
  currentStepId: StepId;
  runState: RunState;
  entityId: EntityId | null;
  decisionsByEntity: Partial<Record<EntityId, FieldDecision[]>>;
  /**
   * The confirmed POST /api/v1/storage/upload result for Step 1's source
   * file, keyed by entity — the seam later steps (Mapping, Validation, ...)
   * read the uploaded fileId from. Set only once the backend has actually
   * persisted the file (see MasterDataUploadScreen's useEffect on the
   * useSourceFileUpload mutation result); never inferred from local CSV
   * parsing, which is preview-only and never reaches the server.
   */
  uploadedFileByEntity: Partial<Record<EntityId, UploadResult>>;
  /** Set by raiseApproval; the approval component reads this to render itself. */
  pendingApproval: ApprovalContext | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface WizardActions {
  setCurrentStepId: (stepId: StepId) => void;
  setRunState: (runState: RunState) => void;
  setEntityId: (entityId: EntityId) => void;

  /** Record the fileId a Step 1 upload was persisted under, once the backend confirms it. */
  setUploadedFile: (entityId: EntityId, result: UploadResult) => void;
  /** Called when the user removes the selected file, so a stale fileId can't be reused. */
  clearUploadedFile: (entityId: EntityId) => void;

  /** Save raises this; it does not write. Confirming it is what produces a FieldDecision. */
  raiseApproval: (context: ApprovalContext) => void;
  /** Dismiss the pending approval without recording anything. */
  cancelApproval: () => void;
  /** The one point where an ai-sourced or user-overridden target becomes a FieldDecision. */
  confirmApproval: (decidedBy?: string) => void;

  excludeField: (entityId: EntityId, fieldId: string, decidedBy?: string) => void;
  /** Undo a decision — e.g. revert a field back to the AI proposal. */
  clearFieldDecision: (entityId: EntityId, fieldId: string) => void;

  reset: () => void;
}

export type WizardStore = WizardState & WizardActions;

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: WizardState = {
  currentStepId: 'upload',
  runState: 'DRY_RUN',
  entityId: null,
  decisionsByEntity: {},
  uploadedFileByEntity: {},
  pendingApproval: null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardStore>()(
  immer((set) => ({
    ...initialState,

    setCurrentStepId: (stepId: StepId): void => {
      set((state) => {
        state.currentStepId = stepId;
      });
    },

    setRunState: (runState: RunState): void => {
      set((state) => {
        state.runState = runState;
      });
    },

    setEntityId: (entityId: EntityId): void => {
      set((state) => {
        state.entityId = entityId;
      });
    },

    setUploadedFile: (entityId: EntityId, result: UploadResult): void => {
      set((state) => {
        state.uploadedFileByEntity[entityId] = result;
      });
    },

    clearUploadedFile: (entityId: EntityId): void => {
      set((state) => {
        delete state.uploadedFileByEntity[entityId];
      });
    },

    raiseApproval: (context: ApprovalContext): void => {
      set((state) => {
        state.pendingApproval = context;
      });
    },

    cancelApproval: (): void => {
      set((state) => {
        state.pendingApproval = null;
      });
    },

    confirmApproval: (decidedBy?: string): void => {
      set((state) => {
        const context = state.pendingApproval;
        if (!context) return;

        const status: FieldDecisionStatus =
          context.reason === 'user-override' ? 'overridden' : 'accepted';
        const decision: FieldDecision = {
          fieldId: context.fieldId,
          status,
          targetId: context.proposedTargetId ?? undefined,
          previousTargetId: context.previousTargetId ?? undefined,
          decidedAt: new Date().toISOString(),
          decidedBy,
        };

        const existing = state.decisionsByEntity[context.entityId] ?? [];
        state.decisionsByEntity[context.entityId] = recordDecision(existing, decision);
        state.pendingApproval = null;
      });
    },

    excludeField: (entityId: EntityId, fieldId: string, decidedBy?: string): void => {
      set((state) => {
        const decision: FieldDecision = {
          fieldId,
          status: 'excluded',
          decidedAt: new Date().toISOString(),
          decidedBy,
        };
        const existing = state.decisionsByEntity[entityId] ?? [];
        state.decisionsByEntity[entityId] = recordDecision(existing, decision);
      });
    },

    clearFieldDecision: (entityId: EntityId, fieldId: string): void => {
      set((state) => {
        const existing = state.decisionsByEntity[entityId] ?? [];
        state.decisionsByEntity[entityId] = clearDecision(existing, fieldId);
      });
    },

    reset: (): void => {
      set(() => ({ ...initialState }));
    },
  })),
);
