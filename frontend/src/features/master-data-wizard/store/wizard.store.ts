/* ============================================================================
   wizard.store.ts  ·  Master-data wizard state — decisions, step nav, approval
   ----------------------------------------------------------------------------
   Root CLAUDE.md, "master-data wizard (dp-kit) rules" #5: "Every write goes
   through one approval component."

   Field decisions stay behind that approval gate — this store never turns
   an ai proposal into state on its own. Accept, Retarget, and Exclude all go
   through raiseApproval -> confirmApproval (rule #4: "If a number cannot be
   recomputed by the profiler, it must not render as fact"; nothing becomes
   state until confirmed) — useApproval.ts is what turns a confirmed
   decision into the real PATCH column-mappings call (DA-401), with
   optimistic-update/rollback orchestration living there, not here.

   Step-rail/progress tracking is a different concern, not a field decision,
   and is not gated behind approval: hydrateEntityProgress and completeStep
   do call the network directly (org-projects/{id}/overview and
   workstreams/.../stages/{id}/complete — see their own doc comments below).

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
import { getWorkstreamProgress, completeWorkstreamStage, type WorkstreamStageInfo } from '../services/entity-pack.service';
import { getOrgProjectOverview } from '@/features/project-overview/services/project-overview.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';

export interface EntityProgress {
  readonly progress: number;
  readonly status: string;
  readonly currentStage: string;
}

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
   * entityId) — ticks locally the instant a screen's Continue is pressed, for
   * an immediate StepRail response, and completeStep() below also mirrors it
   * to the backend (entity-pack.service.ts's completeWorkstreamStage) on a
   * best-effort basis: the local tick never rolls back if that call fails or
   * workstreamStagesByEntity hasn't hydrated yet, so a refresh/new tab/another
   * device may still show it as not-done until the next successful mirror.
   */
  completedStepIdsByEntity: Partial<Record<string, StepId[]>>;
  /**
   * This entity's server-computed progress %, status and current stage —
   * keyed the same way — from GET /api/v1/org-projects/{orgProjectId}/overview
   * (see hydrateEntityProgress). This is the only source for a real 0-100
   * number: GET .../workstreams/{id}/context (workstreamStagesByEntity below)
   * has no percentage field, only per-stage completion flags.
   */
  entityProgressByEntity: Partial<Record<string, EntityProgress>>;
  /**
   * This entity's workstream stage list (id/name/sequence/isCompleted),
   * keyed the same way — resolves a StepId to the stage id
   * completeWorkstreamStage's PATCH expects (stage.name === stepId, per
   * entity-pack.service.ts's own doc comment on the workstream context
   * schema). Hydrated alongside entityProgressByEntity.
   */
  workstreamStagesByEntity: Partial<Record<string, readonly WorkstreamStageInfo[]>>;
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
   * Fetches this entity's own progress/status/current-stage (via
   * GET /org-projects/{orgProjectId}/overview) and its workstream's stage
   * list (via GET /workstreams/{workstreamId}/context), storing both under
   * buildEntityKey(parentProjectId, entityId). Call once on wizard mount —
   * completeStep below needs workstreamStagesByEntity populated to resolve a
   * stage id — and again after every successful completeWorkstreamStage so
   * the displayed percentage reflects the step that was just completed.
   * Best-effort: a failed fetch leaves both maps at whatever they last held.
   */
  hydrateEntityProgress: (entityId: EntityId) => Promise<void>;

  /**
   * Marks `stepId` complete for this entity in local state (immediate
   * StepRail feedback), and best-effort mirrors it to the backend via
   * completeWorkstreamStage when this entity's workstream stage list is
   * already hydrated — see completedStepIdsByEntity's doc comment above.
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
  entityProgressByEntity: {},
  workstreamStagesByEntity: {},
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

    hydrateEntityProgress: async (entityId: EntityId): Promise<void> => {
      const { orgProjectId, workstreamId, parentProjectId } = get();
      if (!orgProjectId) return;
      const key = buildEntityKey(parentProjectId ?? '', entityId);

      // Raw DTO, not toProjectOverview(dto) — that mapper's augmentNotIncluded
      // step can inject client-synthesised placeholder rows (progress: 0,
      // status: 'not_included') for workstreams the backend never returned.
      // Matching directly off the DTO's own groups[].workstreams[] guarantees
      // this only ever stores a real, server-computed row — never a
      // fabricated one rendered as if it were fact (wizard rule #4).
      const overviewPromise = getOrgProjectOverview(httpClient, orgProjectId).catch(() => null);
      const stagesPromise = workstreamId ? getWorkstreamProgress(workstreamId) : Promise.resolve(null);

      const [dto, stagesResult] = await Promise.all([overviewPromise, stagesPromise]);

      set((state) => {
        // React Navigation reuses this screen instance across a project/
        // entity switch — no unmount, just a re-seeded wizard context (see
        // MasterDataWizardScreen's own doc comment) — so by the time this
        // fetch resolves, orgProjectId/workstreamId/parentProjectId may
        // already belong to a different session than the one `key` above was
        // built from. Bail rather than write this entity's data under a key
        // built from a mix of the old entityId and the new project/
        // workstream identifiers.
        if (
          state.orgProjectId !== orgProjectId ||
          state.workstreamId !== workstreamId ||
          state.parentProjectId !== parentProjectId
        ) {
          return;
        }
        // Only ever matched by workstreamId — no items[0] fallback. Without a
        // workstreamId there is no reliable way to pick "this entity's" row
        // out of the response, and guessing risks landing on one of
        // augmentNotIncluded's placeholder rows (moot now that this reads the
        // raw DTO, but a wrong real row is just as much a provenance
        // violation).
        const match = workstreamId
          ? dto?.groups?.flatMap((g) => g.workstreams).find((w) => w.id === workstreamId)
          : undefined;
        if (match) {
          state.entityProgressByEntity[key] = {
            progress: match.progress,
            status: match.status,
            currentStage: match.current_stage,
          };
        }
        if (stagesResult && stagesResult.ok) {
          state.workstreamStagesByEntity[key] = [...stagesResult.data.stages];
          // The StepRail's checkmarks come from completedStepIdsByEntity, not
          // from workstreamStagesByEntity — without this merge, a step the
          // backend already has marked complete (from a previous session, a
          // different tab, or completeStep's own best-effort mirror below)
          // shows as not-done after every refresh, since completedStepIdsByEntity
          // is otherwise only ever written by completeStep's local tick.
          const doneFromServer = stagesResult.data.stages
            .filter((s) => s.isCompleted)
            .map((s) => s.name as StepId);
          const existingDone = state.completedStepIdsByEntity[key] ?? [];
          state.completedStepIdsByEntity[key] = Array.from(
            new Set([...existingDone, ...doneFromServer]),
          );
        }
      });
    },

    completeStep: (entityId: EntityId, stepId: StepId): void => {
      set((state) => {
        const key = buildEntityKey(state.parentProjectId ?? '', entityId);
        const existing = state.completedStepIdsByEntity[key] ?? [];
        if (!existing.includes(stepId)) {
          state.completedStepIdsByEntity[key] = [...existing, stepId];
        }
      });

      const { workstreamId, parentProjectId } = get();
      const key = buildEntityKey(parentProjectId ?? '', entityId);

      void (async (): Promise<void> => {
        let stage = get().workstreamStagesByEntity[key]?.find((s) => s.name === stepId);
        if (!stage) {
          // First Continue on a freshly-opened entity can race
          // hydrateEntityProgress's own in-flight fetch (fired on mount, see
          // MasterDataWizardScreen) — workstreamStagesByEntity isn't
          // populated yet, so the lookup above misses. Retry once, after
          // waiting for a fresh hydrate, instead of silently giving up and
          // never mirroring this step to the backend.
          await get().hydrateEntityProgress(entityId);
          // Session may have moved on to a different project/workstream
          // while we waited on that retry fetch — same reasoning as the
          // guard below, checked here too so a stale stage id is never used.
          if (get().parentProjectId !== parentProjectId || get().workstreamId !== workstreamId) return;
          stage = get().workstreamStagesByEntity[key]?.find((s) => s.name === stepId);
        }
        if (!workstreamId || !stage) return;

        const result = await completeWorkstreamStage(workstreamId, stage.id);
        if (!result.ok) return;
        // Same reasoning as hydrateEntityProgress's own guard above — the
        // session may have moved on to a different project/workstream
        // during this PATCH's round trip. Calling hydrateEntityProgress
        // with this (now stale) entityId against the current, different
        // context would mix the two — skip the refresh rather than
        // contaminate the new session's entry.
        if (get().parentProjectId !== parentProjectId || get().workstreamId !== workstreamId) return;
        void get().hydrateEntityProgress(entityId);
      })();
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
