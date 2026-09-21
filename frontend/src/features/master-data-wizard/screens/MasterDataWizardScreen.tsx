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
   doing Items) never bleed their resume step into each other. This screen
   hydrates it and opens the nested stack on this project+entity's
   last-recorded step instead of always restarting at Upload.

   The uploaded file itself is never read from this store — see
   useOrgProjectFiles/useFileDetails below, both backend-derived, which is
   what lets the sidebar show the same row count in every browser/tab.
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
import { useOrgProjectFiles } from '../hooks/useOrgProjectFiles';
import { useFileDetails } from '../hooks/useFileDetails';
import { MasterDataWizardStack } from '../navigation/MasterDataWizardStack';
import { stepIdToWizardRoute, type MasterDataWizardStackParamList } from '../navigation/masterDataWizardStack.types';
import type { EntityId } from '../types/entity-pack.types';

type WizardRoute = RouteProp<ProjectsStackParamList, 'MasterDataWizard'>;
type WizardNav = NativeStackNavigationProp<ProjectsStackParamList, 'MasterDataWizard'>;

export function MasterDataWizardScreen(): React.JSX.Element {
  const route = useRoute<WizardRoute>();
  const navigation = useNavigation<WizardNav>();
  // Route param field itself stays workstream_id (defined in navigation/types.ts's
  // MasterDataWizard route and shared with McpFetchScreen.tsx/useOpenWorkstream.ts —
  // MCP call sites are out of scope for this rename) — only the local
  // binding below is camelCase, matching the rest of this screen's fields.
  const { orgProjectId, entityId, parentProjectId, workstream_id: workstreamId } = route.params;

  const setWizardContext = useWizardStore((s) => s.setWizardContext);
  const hydrateStepByEntity = useWizardStore((s) => s.hydrateStepByEntity);
  const hydrateUploadedFileByEntity = useWizardStore((s) => s.hydrateUploadedFileByEntity);
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
      // Restores stepByEntity (resume point) and uploadedFileByEntity/
      // sourceCsvByEntity/pipelineRunIdByEntity (Step 1's confirmed file)
      // from storage — both survive a browser refresh or the app being
      // closed and reopened; without the latter, Step 1 would resume on
      // Profile but show an empty dropzone if the user ever navigated Back.
      await Promise.all([hydrateStepByEntity(), hydrateUploadedFileByEntity()]);
      if (cancelled) return;
      setWizardContext({
        entityId: entityId as EntityId,
        orgProjectId,
        parentProjectId,
        workstreamId,
      });
      const resumeStep = useWizardStore.getState().stepByEntity[buildEntityKey(parentProjectId, entityId as EntityId)];
      setInitialRouteName(stepIdToWizardRoute(resumeStep));
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId, orgProjectId, parentProjectId, workstreamId, setWizardContext, hydrateStepByEntity, hydrateUploadedFileByEntity]);

  // The sidebar must show the same "N source rows" on every step, and the
  // same count in every browser/tab. GET /api/v1/storage/files/{fileId}
  // (fileDetails) is the single source of truth for the row count itself;
  // the fileId that feeds it comes from useOrgProjectFiles — the discovery
  // call scoped to org_project_id + workstream_id + entity_id — never from
  // client-persisted state, and never the POST /storage/upload response
  // (this screen never performs the upload itself). This is what lets a
  // second browser/tab opening the same project+entity see the same count
  // a first browser's upload produced, with nothing local to hydrate.
  const discoveredFiles = useOrgProjectFiles(orgProjectId, workstreamId, entityId);
  const fileDetails = useFileDetails(orgProjectId, entityId, workstreamId, discoveredFiles.latestFile?.id ?? null);
  const sidebarSourceRowCount = fileDetails.rowCount ?? 0;
  // This wizard has no target dataset of its own yet (root CLAUDE.md:
  // "There is no write endpoint yet") — mirror the same workstream+entity
  // -scoped file-details count as source rather than leaving this prop
  // unset, which would fall through to MigrationLayout's own useSidebarData(
  // projectId) and read useMigrationStore's targetFile — the unrelated COA
  // migration flow's global store. 0 whenever there's no workstreamId (or
  // no file yet) for this entity.
  const sidebarTargetRowCount = workstreamId ? sidebarSourceRowCount : 0;

  const handleBack = useCallback((): void => {
    navigation.navigate('ProjectOverview', { projectId: parentProjectId });
  }, [navigation, parentProjectId]);

  return (
    <MigrationLayout
      title="DataPortation"
      projectId={parentProjectId}
      onBack={handleBack}
      sourceRowCount={sidebarSourceRowCount}
      targetRowCount={sidebarTargetRowCount}
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
