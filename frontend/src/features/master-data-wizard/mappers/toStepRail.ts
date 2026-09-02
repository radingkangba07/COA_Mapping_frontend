/* ============================================================================
   toStepRail.ts  ·  Taxonomy → StepRail view model
   ----------------------------------------------------------------------------
   The 8 steps and their labels come from the taxonomy — never hardcode a
   step label or number here (root CLAUDE.md, wizard rule #3). `state` is
   computed the same way the web reference does it (app/react/components.tsx
   StepRail): a step is 'done' once its number is behind the current one,
   'active' at the current number, otherwise 'todo'.

   `steps` defaults to dp-kit's vendored taxonomy port (dp-kit/react/
   taxonomy.ts's STEPS, itself generated from dp-kit/config/
   dp-taxonomies.json). Every current caller — useWizardSteps.ts,
   MasterDataUploadScreen.tsx, and the zustand selector in
   store/wizard.selectors.ts — reads STEPS from that same module directly.
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
): StepRailModel {
  const current = steps.find((s) => s.id === currentStepId)?.n ?? 1;

  const items: StepRailItem[] = steps.map((s) => ({
    id: s.id as StepId,
    n: s.n,
    label: s.label,
    short: s.short,
    hasCopilot: s.copilot !== false,
    state: s.n < current ? 'done' : s.n === current ? 'active' : 'todo',
  }));

  return { items, currentN: current, total: steps.length };
}
