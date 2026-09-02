/* ============================================================================
   useWizardSteps.ts  ·  Step-rail view model + navigation
   ----------------------------------------------------------------------------
   Reads/writes wizard.store's currentStepId and derives the rail model via
   mappers/toStepRail.ts — no page ever computes step state itself (root
   CLAUDE.md, wizard rule #3: never hardcode a step label or number).

   Step data comes straight from dp-kit/react/taxonomy.ts's STEPS, itself
   generated from dp-kit/config/dp-taxonomies.json.
   ========================================================================= */

import { useCallback, useMemo } from 'react';
import { useWizardStore } from '../store/wizard.store';
import { STEPS } from '../dp-kit/react/taxonomy';
import { toStepRail } from '../mappers/toStepRail';
import type { StepRailModel } from '../mappers/toStepRail';
import type { StepId } from '../types/wizard.types';

export interface WizardStepsViewModel {
  readonly rail: StepRailModel;
  readonly currentStepId: StepId;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
  readonly goToStep: (stepId: StepId) => void;
  readonly back: () => void;
  readonly next: () => void;
}

export function useWizardSteps(): WizardStepsViewModel {
  const currentStepId = useWizardStore((s) => s.currentStepId);
  const setCurrentStepId = useWizardStore((s) => s.setCurrentStepId);
  const steps = STEPS;

  const rail = useMemo(() => toStepRail(currentStepId, steps), [currentStepId, steps]);

  const goToStep = useCallback(
    (stepId: StepId): void => {
      setCurrentStepId(stepId);
    },
    [setCurrentStepId],
  );

  const back = useCallback((): void => {
    const idx = steps.findIndex((s) => s.id === currentStepId);
    const prev = idx > 0 ? steps[idx - 1] : undefined;
    if (prev) setCurrentStepId(prev.id as StepId);
  }, [currentStepId, setCurrentStepId, steps]);

  const next = useCallback((): void => {
    const idx = steps.findIndex((s) => s.id === currentStepId);
    const nextStep = idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : undefined;
    if (nextStep) setCurrentStepId(nextStep.id as StepId);
  }, [currentStepId, setCurrentStepId, steps]);

  return {
    rail,
    currentStepId,
    canGoBack: rail.currentN > 1,
    canGoNext: rail.currentN < rail.total,
    goToStep,
    back,
    next,
  };
}
