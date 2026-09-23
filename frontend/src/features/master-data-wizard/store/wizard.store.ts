/* ============================================================================
   wizard.store.ts  ·  Master-data wizard state — decisions, step nav, approval
   ----------------------------------------------------------------------------
   Root CLAUDE.md, "master-data wizard (dp-kit) rules" #5: "Every write goes
   through one approval component."

   This store itself stays a pure, synchronous state container — it never
   calls the network. Accept, Retarget, and Exclude all go through
   raiseApproval -> confirmApproval (rule #4: "If a number cannot be
   recomputed by the profiler, it must not render as fact"; nothing becomes
   state until confirmed) — useApproval.ts is what turns a confirmed
   decision into the real PATCH column-mappings call (DA-401), with
   optimistic-update/rollback orchestration living there, not here.

   Decisions are keyed by buildEntityKey(parentProjectId, entityId) because
   entityId is a route parameter and a user can navigate between the 8
   objects in one session (a flat FieldDecision[] would let two objects'
   field ids collide) — and because a workstream, and thus an entityId, is
   re-created per project, so entityId alone would also let two different
   projects' decisions for the "same" object collide.

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
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';

/**
 * A workstream (and thus an entityId, e.g. "items") is re-created per
 * project, so entityId alone is not a unique wizard session — two different
 * projects both running the Items object would otherwise collide on every
 * *ByEntity map below (stepByEntity, uploadedFileByEntity, sourceCsvByEntity,
 * pipelineRunIdByEntity, decisionsByEntity) and each would see the other's
 * data: a resumed step, a "file already uploaded" state, a stale run id,
 * decisions that were never made in this project. Keyed by parentProjectId
 * (the project route param — see MasterDataWizardScreen) + entityId instead.
 * Exported so every read site (screens, selectors) builds the exact same key
 * shape the store's own actions write.
 */
export function buildEntityKey(projectId: string, entityId: EntityId): string {
  return `${projectId}:${entityId}`;
}

// ─── State ──────────────────────────────────────────────────────────────────

interface WizardState {
  currentStepId: StepId;
  runState: RunState;
  entityId: EntityId | null;
  /**
   * The org-project / parent-project / workstream identifiers the whole
   * wizard session runs against. Set once by MasterDataWizardScreen — the
   * single ProjectsStack route all 8 step screens share (see
   * MasterDataWizardStack) — so individual step routes stay param-free and
   * every step reads them from here instead of route params.
   */
  orgProjectId: string | null;
  parentProjectId: string | null;
  workstreamId: string | null;
  /**
   * The furthest/last-viewed step per project+entity (see buildEntityKey),
   * persisted to storageService (see hydrateStepByEntity/recordStep) so it
   * survives a browser refresh or the app being closed and reopened —
   * unlike pendingApproval and the rest of this store's transient state,
   * which is wiped on reload.
   * MasterDataWizardScreen reads this to resume the wizard at the same step
   * the user left it on for a given project+entity, instead of always
   * restarting at Upload or bleeding another project's progress into this
   * one.
   */
  stepByEntity: Partial<Record<string, StepId>>;
  /** Keyed by buildEntityKey(parentProjectId, entityId) — see its doc comment. */
  decisionsByEntity: Partial<Record<string, FieldDecision[]>>;
  /**
   * The confirmed POST /api/v1/storage/upload result for Step 1's source
   * file, keyed by buildEntityKey(parentProjectId, entityId) — the seam
   * later steps (Mapping, Validation, ...) read the uploaded fileId from.
   * Set only once the backend has actually persisted the file (see
   * MasterDataUploadScreen's useEffect on the useSourceFileUpload mutation
   * result); never inferred from local CSV parsing, which is preview-only
   * and never reaches the server. Persisted to storageService (see
   * hydrateUploadedFileByEntity) alongside sourceCsvByEntity/
   * pipelineRunIdByEntity below, so a confirmed upload survives a browser
   * refresh or the app being closed and reopened, not just a screen remount.
   */
  uploadedFileByEntity: Partial<Record<string, UploadResult>>;
  /**
   * The locally-parsed CSV (header row + data rows) backing Step 1's file
   * preview table, keyed by buildEntityKey(parentProjectId, entityId).
   * MasterDataUploadScreen's own fileName/csvRows are plain useState — they
   * don't survive the screen losing its mounted instance (e.g. React
   * Navigation re-creating it on Back), nor a full page reload. This is what
   * lets the screen rehydrate the exact preview for an already-confirmed
   * upload instead of showing an empty dropzone for a file that is, per
   * uploadedFileByEntity, still there. Cleared alongside uploadedFileByEntity.
   */
  sourceCsvByEntity: Partial<Record<string, string[][]>>;
  /**
   * The profiler run id created by POST /api/v1/pipeline/runs for this
   * project+entity's current uploaded file, keyed by
   * buildEntityKey(parentProjectId, entityId). Kept so
   * MasterDataUploadScreen's Continue only ever creates one run per upload —
   * a second Continue press (e.g. after Back, or after a page refresh)
   * reuses this instead of hitting the endpoint again. Cleared alongside
   * uploadedFileByEntity whenever the source file is replaced or removed,
   * since a stale run belongs to the old file.
   */
  pipelineRunIdByEntity: Partial<Record<string, string>>;
  /**
   * The sample CSV loaded via Step 1's "Load sample" button, keyed by
   * buildEntityKey(parentProjectId, entityId) — kept entirely separate from
   * uploadedFileByEntity/sourceCsvByEntity so the sample preview and the
   * actual uploaded-file preview can never overwrite one another. Loading
   * the sample must never touch uploadedFileByEntity/sourceCsvByEntity
   * (it is not an upload — the backend never sees it), and confirming a
   * real upload must never touch this map either. Persisted to
   * storageService (see hydrateUploadedFileByEntity) so, like the other two,
   * it survives a browser refresh or the app being closed and reopened.
   */
  loadPreviewByEntity: Partial<Record<string, { fileName: string; rows: string[][] }>>;
  /**
   * StepRail completion for Upload/Profile, keyed by buildEntityKey(parentProjectId,
   * entityId) — deliberately local-only, mirroring migration.store.ts's
   * completedSteps: completeStep() below never calls the workstream-progress
   * API (contrast entity-pack.service.ts's completeWorkstreamStage, which is
   * no longer wired to these two screens). A step ticks the instant its
   * screen's Continue is pressed, but — same trade-off migration.store.ts
   * accepts — that tick does not survive a refresh, a new tab, or another
   * device, since nothing server-side backs it any more.
   */
  completedStepIdsByEntity: Partial<Record<string, StepId[]>>;
  /** Set by raiseApproval; the approval component reads this to render itself. */
  pendingApproval: ApprovalContext | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface WizardActions {
  setCurrentStepId: (stepId: StepId) => void;
  setRunState: (runState: RunState) => void;

  /**
   * Called by a step screen once it's the one on display, to mark itself as
   * this entity's resume point — persisted immediately so a refresh doesn't
   * lose it. Also updates currentStepId (the live "step on screen" value
   * useWizardSteps/StepRail read).
   */
  recordStep: (entityId: EntityId, stepId: StepId) => void;
  /** Loads the persisted per-entity step map — call once, before reading stepByEntity. */
  hydrateStepByEntity: () => Promise<void>;

  /**
   * Seeds entityId/orgProjectId/parentProjectId/workstreamId for the whole
   * wizard session. Called once, by MasterDataWizardScreen on mount.
   */
  setWizardContext: (context: {
    entityId: EntityId;
    orgProjectId: string;
    parentProjectId: string;
    workstreamId: string;
  }) => void;

  /** Record the fileId a Step 1 upload was persisted under, once the backend confirms it. */
  setUploadedFile: (entityId: EntityId, result: UploadResult) => void;
  /** Called when the user removes the selected file, so a stale fileId can't be reused. */
  clearUploadedFile: (entityId: EntityId) => void;

  /** Record the parsed CSV (header + rows) backing Step 1's preview table for this entity. */
  setSourceCsv: (entityId: EntityId, rows: string[][]) => void;
  /** Called alongside clearUploadedFile so a stale preview can't be reused. */
  clearSourceCsv: (entityId: EntityId) => void;

  /** Record the profiler run id created for this entity's current upload. */
  setPipelineRunId: (entityId: EntityId, runId: string) => void;
  /** Called alongside clearUploadedFile so a stale run id can't be reused. */
  clearPipelineRunId: (entityId: EntityId) => void;

  /**
   * Record the sample CSV loaded via "Load sample" for this entity. Never
   * touches uploadedFileByEntity/sourceCsvByEntity — see loadPreviewByEntity's
   * doc comment.
   */
  setLoadPreview: (entityId: EntityId, fileName: string, rows: string[][]) => void;
  /** Clear this entity's loaded sample preview, independent of clearUploadedFile/clearSourceCsv. */
  clearLoadPreview: (entityId: EntityId) => void;

  /**
   * Loads the persisted uploadedFileByEntity/sourceCsvByEntity/
   * pipelineRunIdByEntity/loadPreviewByEntity maps — call once, alongside
   * hydrateStepByEntity, before reading them. Without this a browser refresh
   * (or the app being closed and reopened) would show Step 1 as empty even
   * though the backend already has the file, because those maps otherwise
   * only live in memory.
   */
  hydrateUploadedFileByEntity: () => Promise<void>;

  /**
   * Marks `stepId` complete for this entity, purely in local state — no
   * network call. See completedStepIdsByEntity's doc comment above.
   */
  completeStep: (entityId: EntityId, stepId: StepId) => void;

  /** Save raises this; it does not write. Confirming it is what produces a FieldDecision. */
  raiseApproval: (context: ApprovalContext) => void;
  /** Dismiss the pending approval without recording anything. */
  cancelApproval: () => void;
  /** The one point where an ai-sourced or user-overridden target becomes a FieldDecision. */
  confirmApproval: (decidedBy?: string) => void;

  /** Undo a decision — e.g. revert a field back to the AI proposal. */
  clearFieldDecision: (entityId: EntityId, fieldId: string) => void;
  /** Records a field as excluded directly — used by the write paths that don't go through the raise/confirm approval flow. */
  excludeField: (entityId: EntityId, fieldId: string, decidedBy?: string) => void;

  reset: () => void;
}

export type WizardStore = WizardState & WizardActions;

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: WizardState = {
  currentStepId: 'upload',
  runState: 'DRY_RUN',
  entityId: null,
  orgProjectId: null,
  parentProjectId: null,
  workstreamId: null,
  stepByEntity: {},
  decisionsByEntity: {},
  uploadedFileByEntity: {},
  sourceCsvByEntity: {},
  pipelineRunIdByEntity: {},
  loadPreviewByEntity: {},
  completedStepIdsByEntity: {},
  pendingApproval: null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardStore>()(
  immer((set, get) => ({
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

    setWizardContext: (context): void => {
      set((state) => {
        state.entityId = context.entityId;
        state.orgProjectId = context.orgProjectId;
        state.parentProjectId = context.parentProjectId;
        state.workstreamId = context.workstreamId;
      });
    },

    recordStep: (entityId: EntityId, stepId: StepId): void => {
      set((state) => {
        state.currentStepId = stepId;
        // parentProjectId is always seeded by setWizardContext before any
        // step screen (and thus recordStep) can mount — see
        // MasterDataWizardScreen.
        state.stepByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] = stepId;
      });
      // Best-effort — a failed write just means a future refresh falls back
      // to Upload for this entity instead of resuming, not a broken wizard.
      storageService
        .set(STORAGE_KEYS.WIZARD_STEP_BY_ENTITY, JSON.stringify(get().stepByEntity))
        .catch(() => {});
    },

    hydrateStepByEntity: async (): Promise<void> => {
      try {
        const raw = await storageService.get(STORAGE_KEYS.WIZARD_STEP_BY_ENTITY);
        if (raw === null) return;
        const parsed = JSON.parse(raw) as Partial<Record<string, StepId>>;
        set((state) => {
          state.stepByEntity = parsed;
        });
      } catch {
        // Corrupt or missing storage — keep stepByEntity at its initial {}.
      }
    },

    setUploadedFile: (entityId: EntityId, result: UploadResult): void => {
      set((state) => {
        state.uploadedFileByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] = result;
      });
      // Best-effort — a failed write just means a future refresh falls back
      // to an empty dropzone for this entity instead of resuming it, not a
      // broken wizard (the backend already has the file either way).
      storageService
        .set(STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY, JSON.stringify(get().uploadedFileByEntity))
        .catch(() => {});
    },

    clearUploadedFile: (entityId: EntityId): void => {
      set((state) => {
        delete state.uploadedFileByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)];
      });
      storageService
        .set(STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY, JSON.stringify(get().uploadedFileByEntity))
        .catch(() => {});
    },

    setSourceCsv: (entityId: EntityId, rows: string[][]): void => {
      set((state) => {
        state.sourceCsvByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] = rows;
      });
      storageService
        .set(STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY, JSON.stringify(get().sourceCsvByEntity))
        .catch(() => {});
    },

    clearSourceCsv: (entityId: EntityId): void => {
      set((state) => {
        delete state.sourceCsvByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)];
      });
      storageService
        .set(STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY, JSON.stringify(get().sourceCsvByEntity))
        .catch(() => {});
    },

    setPipelineRunId: (entityId: EntityId, runId: string): void => {
      set((state) => {
        state.pipelineRunIdByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] = runId;
      });
      // Merge with whatever is already in storage before writing back.
      // McpFetchScreen can call this before hydrateUploadedFileByEntity runs, so
      // the in-memory map may be {} — serialising it directly would wipe other
      // entities' run IDs that were persisted from a previous session.
      storageService
        .get(STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY)
        .then((stored) => {
          const existing = stored ? (JSON.parse(stored) as Partial<Record<string, string>>) : {};
          const merged = { ...existing, ...get().pipelineRunIdByEntity };
          return storageService.set(STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY, JSON.stringify(merged));
        })
        .catch(() => {});
    },

    clearPipelineRunId: (entityId: EntityId): void => {
      set((state) => {
        delete state.pipelineRunIdByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)];
      });
      // Same merge-before-write pattern as setPipelineRunId: read storage first
      // so a cold-session clear (in-memory map still {}) does not wipe other
      // entities' persisted run IDs.
      storageService
        .get(STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY)
        .then((stored) => {
          const existing = stored ? (JSON.parse(stored) as Partial<Record<string, string>>) : {};
          const key = buildEntityKey(get().parentProjectId ?? '', entityId);
          const { [key]: _removed, ...rest } = { ...existing, ...get().pipelineRunIdByEntity };
          return storageService.set(STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY, JSON.stringify(rest));
        })
        .catch(() => {});
    },

    setLoadPreview: (entityId: EntityId, fileName: string, rows: string[][]): void => {
      set((state) => {
        state.loadPreviewByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] = { fileName, rows };
      });
      storageService
        .set(STORAGE_KEYS.WIZARD_LOAD_PREVIEW_BY_ENTITY, JSON.stringify(get().loadPreviewByEntity))
        .catch(() => {});
    },

    clearLoadPreview: (entityId: EntityId): void => {
      set((state) => {
        delete state.loadPreviewByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)];
      });
      storageService
        .set(STORAGE_KEYS.WIZARD_LOAD_PREVIEW_BY_ENTITY, JSON.stringify(get().loadPreviewByEntity))
        .catch(() => {});
    },

    hydrateUploadedFileByEntity: async (): Promise<void> => {
      try {
        const raw = await storageService.get(STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as Partial<Record<string, UploadResult>>;
          set((state) => {
            state.uploadedFileByEntity = parsed;
          });
        }
      } catch {
        // Corrupt or missing storage — keep uploadedFileByEntity at its initial {}.
      }
      try {
        const raw = await storageService.get(STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as Partial<Record<string, string[][]>>;
          set((state) => {
            state.sourceCsvByEntity = parsed;
          });
        }
      } catch {
        // Corrupt or missing storage — keep sourceCsvByEntity at its initial {}.
      }
      try {
        const raw = await storageService.get(STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as Partial<Record<string, string>>;
          set((state) => {
            state.pipelineRunIdByEntity = parsed;
          });
        }
      } catch {
        // Corrupt or missing storage — keep pipelineRunIdByEntity at its initial {}.
      }
      try {
        const raw = await storageService.get(STORAGE_KEYS.WIZARD_LOAD_PREVIEW_BY_ENTITY);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as Partial<Record<string, { fileName: string; rows: string[][] }>>;
          set((state) => {
            state.loadPreviewByEntity = parsed;
          });
        }
      } catch {
        // Corrupt or missing storage — keep loadPreviewByEntity at its initial {}.
      }
    },

    completeStep: (entityId: EntityId, stepId: StepId): void => {
      set((state) => {
        const key = buildEntityKey(state.parentProjectId ?? '', entityId);
        const existing = state.completedStepIdsByEntity[key] ?? [];
        if (!existing.includes(stepId)) {
          state.completedStepIdsByEntity[key] = [...existing, stepId];
        }
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

        // DA-384: one decision per accepted row, all 'accepted' — bulk has
        // no override/exclude variant, so this branch never needs the
        // status-derivation ternary below.
        if (context.reason === 'bulk-accept' && context.bulkFields) {
          const decidedAt = new Date().toISOString();
          const bulkKey = buildEntityKey(state.parentProjectId ?? '', context.entityId);
          let existing = state.decisionsByEntity[bulkKey] ?? [];
          for (const bulkField of context.bulkFields) {
            existing = recordDecision(existing, {
              fieldId: bulkField.fieldId,
              status: 'accepted',
              targetId: bulkField.targetFieldId,
              decidedAt,
              decidedBy,
            });
          }
          state.decisionsByEntity[bulkKey] = existing;
          state.pendingApproval = null;
          return;
        }

        const status: FieldDecisionStatus =
          context.reason === 'user-override' ? 'overridden' : context.reason === 'exclude' ? 'excluded' : 'accepted';
        const decision: FieldDecision = {
          fieldId: context.fieldId,
          status,
          targetId: context.proposedTargetId ?? undefined,
          previousTargetId: context.previousTargetId ?? undefined,
          decidedAt: new Date().toISOString(),
          decidedBy,
        };

        const key = buildEntityKey(state.parentProjectId ?? '', context.entityId);
        const existing = state.decisionsByEntity[key] ?? [];
        state.decisionsByEntity[key] = recordDecision(existing, decision);
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
        const key = buildEntityKey(state.parentProjectId ?? '', entityId);
        const existing = state.decisionsByEntity[key] ?? [];
        state.decisionsByEntity[key] = recordDecision(existing, decision);
      });
    },

    clearFieldDecision: (entityId: EntityId, fieldId: string): void => {
      set((state) => {
        const key = buildEntityKey(state.parentProjectId ?? '', entityId);
        const existing = state.decisionsByEntity[key] ?? [];
        state.decisionsByEntity[key] = clearDecision(existing, fieldId);
      });
    },

    reset: (): void => {
      set(() => ({ ...initialState }));
    },
  })),
);
