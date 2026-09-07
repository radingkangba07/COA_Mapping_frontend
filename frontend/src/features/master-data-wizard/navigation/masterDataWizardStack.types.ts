/* ============================================================================
   masterDataWizardStack.types.ts  ·  Param list for the nested wizard stack
   ----------------------------------------------------------------------------
   Every one of the 8 master-data wizard steps (Upload, Profile, and the 6
   still to be built) lives here, nested one level inside the single
   'MasterDataWizard' ProjectsStack route — see MasterDataWizardScreen and
   MasterDataWizardStack. Deliberately param-free: each step reads its
   session identifiers (entityId/orgProjectId/parentProjectId/workstreamId)
   from wizard.store, seeded once by MasterDataWizardScreen, so adding a step
   never touches ProjectsStackParamList.

   Kept in its own file (not inside MasterDataWizardStack.tsx) so the step
   screens can import the type without importing the navigator component
   itself.
   ========================================================================= */

import type { StepId } from '../types/wizard.types';

export type MasterDataWizardStackParamList = {
  Upload: undefined;
  Profile: undefined;
};

// One entry per step that actually has a route — steps 3-8 add a line here
// (and a <Stack.Screen> in MasterDataWizardStack.tsx) as they're built.
const STEP_ROUTE: Partial<Record<StepId, keyof MasterDataWizardStackParamList>> = {
  upload: 'Upload',
  profile: 'Profile',
};

/**
 * Maps a persisted/resume StepId (wizard.store's stepByEntity) to the nested
 * stack's route name — falling back to Upload for a step with no route yet
 * (steps 3-8) or no persisted step at all (first-ever visit).
 */
export function stepIdToWizardRoute(stepId: StepId | undefined): keyof MasterDataWizardStackParamList {
  return (stepId && STEP_ROUTE[stepId]) ?? 'Upload';
}
