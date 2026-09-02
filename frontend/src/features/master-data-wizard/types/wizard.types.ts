/* ============================================================================
   wizard.types.ts  ·  Wizard-level step and run-state types
   ----------------------------------------------------------------------------
   StepId re-exports dp-kit's generated step union (via entity-pack.types.ts)
   so the wizard never keeps a second copy of the step list — see root
   CLAUDE.md rule "never hardcode a step label or number".

   RunState and WizardUiState are NOT specified anywhere in dp-kit or
   docs/handover — nothing there describes a write-execution mode. This is
   this app's own addition, added so screens can gate copy/buttons ahead of
   the write endpoint landing (root CLAUDE.md: "There is no write endpoint
   yet"). If this is meant to reflect a real backend concept, confirm with
   whoever owns the write-side spec before wiring it to anything live.
   ========================================================================= */

import type { StepId } from './entity-pack.types';

export type { StepId };

/**
 * Whether an operation only simulates the wizard's write side or performs it
 * for real.
 */
export type RunState = 'DRY_RUN' | 'LIVE_WRITE';

/** Wizard-level UI state — not server data. Kept separate from EntityPack. */
export interface WizardUiState {
  currentStepId: StepId;
  runState: RunState;
}
