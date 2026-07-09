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

export function WorkstreamDetailScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<ProjectsStackParamList, 'WorkstreamDetail'>>();
  const navigation = useNavigation();
  const { projectId, workstreamId } = route.params;

  useEffect(() => {
    let cancelled = false;

    async function prepareAndNavigate(): Promise<void> {
      try {
        type ContextResp = { project: { source_system: string; target_system: string } };
        const { data } = await httpClient.get<ContextResp>(
          `/api/v1/workstreams/${workstreamId}/context`,
        );

        if (cancelled) return;

        const systems = useERPConfigStore.getState().erpSystems;
        const store = useMigrationStore.getState();
        const sourceERP = findERP(data.project.source_system, systems);
        const targetERP = findERP(data.project.target_system, systems);

        if (sourceERP) store.setSourceERP(sourceERP);
        if (targetERP) store.setTargetERP(targetERP);
        store.setStep(1);
        store.setProjectId(projectId);
      } catch {
        // Context fetch failed — UploadScreen will hydrate from the project API
      }

      if (cancelled) return;

      // Pop WorkstreamDetail from ProjectsStack so that when the user presses
      // Back on the Upload screen, ProjectsTab restores to ProjectOverview.
      navigation.dispatch(StackActions.pop());

      // Switch to MigrationTab and push Upload onto its stack.
      const tabNav = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();
      tabNav?.navigate('MigrationTab', {
        screen: 'Upload',
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
