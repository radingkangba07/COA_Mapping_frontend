/* ============================================================================
   toStepRail.ts  ·  Taxonomy → StepRail view model
   ----------------------------------------------------------------------------
   The 8 steps and their labels come from the taxonomy — never hardcode a
   step label or number here (root CLAUDE.md, wizard rule #3).

   `state` is NOT derived from position (a step used to be "done" just
   because its number was behind whichever step you happened to be looking
   at). This function stays agnostic about where `completedStepIds` and
   `currentStepId` come from — the caller decides:
     - Upload/Profile screens (MasterDataUploadScreen.tsx,
       SourceDataProfileScreen.tsx) source both from wizard.store.ts's local
       currentStepId/completedStepIdsByEntity — same pattern as
       migration.store.ts's completedSteps, deliberately local-only, so a
       step ticks the instant Continue is pressed but does not survive a
       refresh/new device (see wizard.store.ts's completedStepIdsByEntity
       doc comment for the trade-off). completeWorkstreamStage/
       getWorkstreamProgress (entity-pack.service.ts) remain implemented but
       are no longer wired to these two screens.
     - done   -> this step's id is in `completedStepIds` — never inferred
                 from position.
     - active -> this step's id equals `currentStepId` — mutually exclusive
                 with `done`, so the active step never shows a completed
                 tick even if a caller accidentally left it in
                 `completedStepIds`.
     - todo   -> everything else.

   `steps` defaults to dp-kit's vendored taxonomy port (dp-kit/react/
   taxonomy.ts's STEPS, itself generated from dp-kit/config/
   dp-taxonomies.json).
   ========================================================================= */

import { STEPS as STATIC_STEPS } from '../dp-kit/react/taxonomy';
import type { StepId } from '../types/wizard.types';

/** Element shape of dp-kit/react/taxonomy.ts's STEPS — the single source of truth. */
type TaxonomyStepItem = (typeof STATIC_STEPS)[number];

export type StepRailItemState = 'done' | 'active' | 'todo';

export interface StepRailItem {
  readonly id: StepId;
  readonly n: number;
  readonly label: string;
  readonly short: string;
  readonly hasCopilot: boolean;
  readonly state: StepRailItemState;
}

export interface StepRailModel {
  readonly items: StepRailItem[];
  readonly currentN: number;
  readonly total: number;
}

export function toStepRail(
  currentStepId: StepId,
  steps: readonly TaxonomyStepItem[] = STATIC_STEPS,
  completedStepIds: ReadonlySet<StepId> | readonly StepId[] = [],
): StepRailModel {
  const current = steps.find((s) => s.id === currentStepId)?.n ?? 1;
  const completed = completedStepIds instanceof Set ? completedStepIds : new Set(completedStepIds);

  const items: StepRailItem[] = steps.map((s) => {
    const id = s.id as StepId;
    const state: StepRailItemState = id === currentStepId ? 'active' : completed.has(id) ? 'done' : 'todo';
    return {
      id,
      n: s.n,
      label: s.label,
      short: s.short,
      hasCopilot: s.copilot !== false,
      state,
    };
  });

  return { items, currentN: current, total: steps.length };
}
