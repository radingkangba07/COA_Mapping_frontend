import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { Workstream } from '../types/workstream.types';

// ─── Hook ─────────────────────────────────────────────────────────────────────


export function useOpenWorkstream(
  projectId: string,
): (workstream: Workstream) => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProjectsStackParamList>>();

  return useCallback(
    (workstream: Workstream): void => {
      if (!workstream.included) return;
      // Non-COA workstreams belong to an OrgProject — pass its ID so the
      // migration store and file upload use the correct entity.
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
