/* ============================================================================
   MasterDataWizardScreen.tsx  ·  The single ProjectsStack route for the wizard
   ----------------------------------------------------------------------------
   Owns the one MigrationLayout/sidebar instance the whole wizard shares —
   previously each of the 8 steps wrapped itself in its own MigrationLayout,
   so the sidebar (and its data-fetching) re-mounted on every step
   transition. MasterDataWizardStack (nested inside `children` below) is what
   actually switches between steps; this screen never re-renders when it
   does.

   Seeds wizard.store's session context (entityId/orgProjectId/
   parentProjectId/workstreamId) from this route's params before the nested
   stack is allowed to mount — every step screen reads those from the store,
   never from its own route params, so no step ever needs to see them as
   possibly-null.

   Also resumes the wizard where the user left off: wizard.store's
   stepByEntity is persisted to storage (see wizard.store.ts), so it
   survives a full browser refresh even though the rest of this in-memory
   store doesn't. It's keyed by project+entity (buildEntityKey), not entity
   alone, so two different projects running the same object (e.g. both
   doing Items) never bleed their resume step — or, per uploadedFileByEntity/
   sourceCsvByEntity below, their uploaded file — into each other. This
   screen hydrates it and opens the nested stack on this project+entity's
   last-recorded step instead of always restarting at Upload.
   ========================================================================= */

import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '@/navigation/types';
import { MigrationLayout } from '@/features/migration/components/MigrationLayout';
import { Spinner } from '@/shared/components/ui/Spinner';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { MasterDataWizardStack } from '../navigation/MasterDataWizardStack';
import { stepIdToWizardRoute, type MasterDataWizardStackParamList } from '../navigation/masterDataWizardStack.types';
import type { EntityId } from '../types/entity-pack.types';

type WizardRoute = RouteProp<ProjectsStackParamList, 'MasterDataWizard'>;
type WizardNav = NativeStackNavigationProp<ProjectsStackParamList, 'MasterDataWizard'>;

export function MasterDataWizardScreen(): React.JSX.Element {
  const route = useRoute<WizardRoute>();
  const navigation = useNavigation<WizardNav>();
  const { orgProjectId, entityId, parentProjectId, workstream_id } = route.params;

  const setWizardContext = useWizardStore((s) => s.setWizardContext);
  const hydrateStepByEntity = useWizardStore((s) => s.hydrateStepByEntity);
  // Zustand state updates don't take effect synchronously mid-render, so the
  // very first render would otherwise mount MasterDataWizardStack (and thus
  // Upload) before the store has this session's identifiers and its
  // persisted resume step — gate on this instead of assuming the effect
  // below has already run.
  const [initialRouteName, setInitialRouteName] = useState<keyof MasterDataWizardStackParamList | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Reset to the loading state on every run of this effect, not just the
    // first — React Navigation reuses this screen instance (and merges new
    // params) when navigate() targets an already-mounted 'MasterDataWizard'
    // route, so a project/entity switch re-runs this effect without
    // remounting the component. Falling through to the Spinner branch here
    // unmounts the stale MasterDataWizardStack instance instead of leaving
    // it on screen with the previous project's resume step — React Navigation
    // ignores a changed initialRouteName prop on an already-mounted
    // navigator, so that stack has to be torn down and re-created, not
    // patched in place.
    setInitialRouteName(null);
    void (async (): Promise<void> => {
      await hydrateStepByEntity();
      if (cancelled) return;
      setWizardContext({
        entityId: entityId as EntityId,
        orgProjectId,
        parentProjectId,
        workstreamId: workstream_id,
      });
      const resumeStep = useWizardStore.getState().stepByEntity[buildEntityKey(parentProjectId, entityId as EntityId)];
      setInitialRouteName(stepIdToWizardRoute(resumeStep));
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId, orgProjectId, parentProjectId, workstream_id, setWizardContext, hydrateStepByEntity]);

  // The sidebar must show the same "N source rows" on every step — read
  // from the same wizard-store fields Step 1's own dropzone count comes
  // from (see MasterDataUploadScreen), not from any one step's fetched
  // pack, which may not even be loaded yet on the current step.
  const entityKey = buildEntityKey(parentProjectId, entityId as EntityId);
  const storedCsv = useWizardStore((s) => s.sourceCsvByEntity[entityKey]);
  const storedUpload = useWizardStore((s) => s.uploadedFileByEntity[entityKey]);
  const sidebarSourceRowCount = storedCsv
    ? Math.max(0, storedCsv.length - 1)
    : storedUpload?.rowCount ?? undefined;

  const handleBack = useCallback((): void => {
    navigation.navigate('ProjectOverview', { projectId: parentProjectId });
  }, [navigation, parentProjectId]);

  return (
    <MigrationLayout
      title="DataPortation"
      projectId={parentProjectId}
      onBack={handleBack}
      sourceRowCount={sidebarSourceRowCount}
      testID="master-data-wizard-screen"
    >
      {initialRouteName ? (
        <MasterDataWizardStack initialRouteName={initialRouteName} />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      )}
    </MigrationLayout>
  );
}
