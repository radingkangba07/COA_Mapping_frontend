/* ============================================================================
   wizard.selectors.ts  ·  Derived reads over wizard.store
   ----------------------------------------------------------------------------
   Step progress delegates to mappers/toStepRail.ts — the same taxonomy-backed
   computation hooks/useWizardSteps.ts uses — never hardcode a step label or
   number here (root CLAUDE.md, wizard rule #3). This file used to read
   config/steps.ts's hand-duplicated WIZARD_STEPS array directly, which meant
   two independently-maintained "current step" computations existed side by
   side; config/steps.ts has been retired in favour of the single dp-kit
   taxonomy path (dp-kit/react/taxonomy.ts -> mappers/toStepRail.ts).

   Decision lookups delegate to services/decision.service.ts so there is one
   place that knows how to read a FieldDecision list — the store, this file,
   and any future caller all agree on the same lookup.
   ========================================================================= */

import { buildEntityKey, type WizardStore } from './wizard.store';
import type { StepId, RunState } from '../types/wizard.types';
import type { EntityId } from '../types/entity-pack.types';
import type { FieldDecision, ApprovalContext, MappingOverrides } from '../types/decision.types';
import type { UploadResult } from '../types/upload.types';
import { getDecision, buildOverrides } from '../services/decision.service';
import { toStepRail } from '../mappers/toStepRail';

// ─── Step / Run State ───────────────────────────────────────────────────────

export const selectCurrentStepId = (state: WizardStore): StepId => state.currentStepId;

export const selectRunState = (state: WizardStore): RunState => state.runState;

export const selectEntityId = (state: WizardStore): EntityId | null => state.entityId;

/** The Step 1 upload's backend-confirmed fileId/metadata for this project+entity, if any. */
export const selectUploadedFileForEntity = (
  state: WizardStore,
  entityId: EntityId,
): UploadResult | null =>
  state.uploadedFileByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] ?? null;

export interface StepProgress {
  readonly n: number;
  readonly total: number;
  readonly label: string;
}

export const selectStepProgress = (state: WizardStore): StepProgress => {
  const rail = toStepRail(state.currentStepId);
  const current = rail.items.find((item) => item.state === 'active');
  return {
    n: current?.n ?? 1,
    total: rail.total,
    label: current?.label ?? '',
  };
};

// ─── Approval ───────────────────────────────────────────────────────────────

export const selectPendingApproval = (state: WizardStore): ApprovalContext | null =>
  state.pendingApproval;

// ─── Decisions ──────────────────────────────────────────────────────────────

export const selectDecisionsForEntity = (
  state: WizardStore,
  entityId: EntityId,
): FieldDecision[] => state.decisionsByEntity[buildEntityKey(state.parentProjectId ?? '', entityId)] ?? [];

export const selectFieldDecision = (
  state: WizardStore,
  entityId: EntityId,
  fieldId: string,
): FieldDecision | null => getDecision(selectDecisionsForEntity(state, entityId), fieldId);

/** fieldId -> targetId map for fields the user has explicitly overridden. */
export const selectOverridesForEntity = (
  state: WizardStore,
  entityId: EntityId,
): MappingOverrides => buildOverrides(selectDecisionsForEntity(state, entityId));

export interface DecisionCounts {
  readonly accepted: number;
  readonly excluded: number;
  readonly overridden: number;
}

export const selectDecisionCounts = (
  state: WizardStore,
  entityId: EntityId,
): DecisionCounts => {
  const decisions = selectDecisionsForEntity(state, entityId);
  return {
    accepted: decisions.filter((d) => d.status === 'accepted').length,
    excluded: decisions.filter((d) => d.status === 'excluded').length,
    overridden: decisions.filter((d) => d.status === 'overridden').length,
  };
};
