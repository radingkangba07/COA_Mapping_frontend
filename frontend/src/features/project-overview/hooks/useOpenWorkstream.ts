import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { Workstream } from '../types/workstream.types';

// Workstreams that launch the master-data wizard (Upload → Profile → …).
// All other openable workstreams (Chart of Accounts) use the existing migration flow.
const MASTER_DATA_NAMES = new Set(['Items']);

export function useOpenWorkstream(
  projectId: string,
): (workstream: Workstream) => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProjectsStackParamList>>();

  return useCallback(
    (workstream: Workstream): void => {
      if (!workstream.included) return;

      if (MASTER_DATA_NAMES.has(workstream.name) && workstream.orgProjectId != null) {
        navigation.navigate('MasterDataUpload', {
          orgProjectId: workstream.orgProjectId,
          entityId: workstream.name.toLowerCase(),
          parentProjectId: projectId,
        });
        return;
      }

      // Chart of Accounts: existing migration flow
      const entityId = workstream.orgProjectId ?? projectId;
      navigation.navigate('WorkstreamDetail', {
        projectId: entityId,
        workstreamId: workstream.id,
        kind: workstream.projectId,
      });
    },
    [navigation, projectId],
  );
}
