import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ProjectsStackParamList, AppTabsParamList } from '@/navigation/types';
import { colors } from '@/config/theme';
import { httpClient } from '@/shared/services/http/http.instance';
import { useMigrationStore } from '@/features/migration/store/migration.store';
import { useERPConfigStore } from '@/features/erp-config/store/erp-config.store';
import type { ERPSystem } from '@/features/erp-config/types/erp-config.types';

function findERP(value: string, systems: readonly ERPSystem[]): ERPSystem | undefined {
  const lower = value.toLowerCase();
  return (
    systems.find((s) => s.id.toLowerCase() === lower) ??
    systems.find((s) => s.name.toLowerCase() === lower)
  );
}

type ContextResp = {
  status: string | null;
  current_stage: string | null;
  project: { source_system: string; target_system: string };
};

function stageToStep(currentStage: string | null): { step: number; screen: string } {
  if (!currentStage || currentStage === 'Upload Files') return { step: 1, screen: 'Upload' };
  if (currentStage === 'Type Mapping') return { step: 2, screen: 'Mapping' };
  if (currentStage.startsWith('Account Mapping:')) return { step: 3, screen: 'Validation' };
  if (currentStage === 'Preview & Export') return { step: 4, screen: 'FinalPreview' };
  return { step: 1, screen: 'Upload' };
}

export function WorkstreamDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<ProjectsStackParamList, 'WorkstreamDetail'>>();
  const navigation = useNavigation();
  const { projectId, workstreamId } = route.params;

  useEffect(() => {
    let cancelled = false;

    async function prepareAndNavigate(): Promise<void> {
      let targetScreen = 'Upload';

      try {
        const { data } = await httpClient.get<ContextResp>(
          `/api/v1/workstreams/${workstreamId}/context`,
        );

        if (cancelled) return;

        const systems = useERPConfigStore.getState().erpSystems;
        const store = useMigrationStore.getState();

        // Reset stale completedSteps before setting fresh ones — completeStep
        // only ever adds, so without a reset a prior session's steps persist and
        // the stepper shows future stages as already complete.
        store.reset();

        const sourceERP = findERP(data.project.source_system, systems);
        const targetERP = findERP(data.project.target_system, systems);

        if (sourceERP) store.setSourceERP(sourceERP);
        if (targetERP) store.setTargetERP(targetERP);

        const { step, screen } = data.status === 'completed'
          ? { step: 4, screen: 'FinalPreview' }
          : stageToStep(data.current_stage);
        for (let i = 0; i < step; i++) {
          store.completeStep(i);
        }
        store.setStep(step);
        store.setProjectId(projectId);
        store.setWorkstreamId(workstreamId);
        targetScreen = screen;
      } catch {
        // Context fetch failed — UploadScreen will hydrate from the project API
      }

      if (cancelled) return;

      // Pop WorkstreamDetail from ProjectsStack so that when the user presses
      // Back on the target screen, ProjectsTab restores to ProjectOverview.
      navigation.dispatch(StackActions.pop());

      // Switch to MigrationTab and push the correct screen onto its stack.
      const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();
      tabNav?.navigate('MigrationTab', {
        screen: targetScreen as 'Upload',
        params: { projectId },
      });
    }

    void prepareAndNavigate();
    return () => {
      cancelled = true;
    };
  }, [workstreamId, projectId, navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
