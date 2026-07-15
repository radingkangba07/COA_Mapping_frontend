import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { Workstream } from '../types/workstream.types';

// ─── Hook ─────────────────────────────────────────────────────────────────────
// Returns a stable callback that navigates to WorkstreamDetail for the given
// workstream. Non-included workstreams are silently ignored (they have no route).

export function useOpenWorkstream(
  projectId: string,
): (workstream: Workstream) => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProjectsStackParamList>>();

  return useCallback(
    (workstream: Workstream): void => {
      if (!workstream.included) return;
      navigation.navigate('WorkstreamDetail', {
        projectId,
        workstreamId: workstream.id,
        kind: workstream.projectId,
      });
    },
    [navigation, projectId],
  );
}
