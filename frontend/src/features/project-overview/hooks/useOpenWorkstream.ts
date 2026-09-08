import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { EntityId } from '@/features/master-data-wizard/types/entity-pack.types';
import type { Workstream } from '../types/workstream.types';

// Workstreams that launch the master-data wizard (Upload → Profile → …),
// keyed by the exact label MigrationScope.config.ts's MASTER_DATA_ITEMS uses
// (the source of truth for every workstream name shown on the overview) and
// mapped to the wizard's own EntityId slug — plain `.toLowerCase()` broke for
// "Fixed Assets" (-> "fixed assets", not the EntityId "fixedAssets"), which
// silently fell through to the Chart of Accounts branch below instead of
// opening the wizard. All other openable workstreams (Chart of Accounts) use
// the existing migration flow.
const MASTER_DATA_ENTITY_BY_NAME: Readonly<Record<string, EntityId>> = {
  Customers: 'customers',
  Vendors: 'vendors',
  Items: 'items',
  Locations: 'locations',
  Contacts: 'contacts',
  Vehicles: 'vehicles',
  Equipment: 'equipment',
  'Fixed Assets': 'fixedAssets',
};

export function useOpenWorkstream(
  projectId: string,
): (workstream: Workstream) => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<ProjectsStackParamList>>();

  return useCallback(
    (workstream: Workstream): void => {
      if (!workstream.included) return;

      const entityId = MASTER_DATA_ENTITY_BY_NAME[workstream.name];
      if (entityId !== undefined && workstream.orgProjectId != null) {
        navigation.navigate('MasterDataWizard', {
          orgProjectId: workstream.orgProjectId,
          entityId,
          parentProjectId: projectId,
          workstream_id: workstream.id,
        });
        return;
      }

      // Chart of Accounts: existing migration flow
      const coaProjectId = workstream.orgProjectId ?? projectId;
      navigation.navigate('WorkstreamDetail', {
        projectId: coaProjectId,
        workstreamId: workstream.id,
        kind: workstream.projectId,
      });
    },
    [navigation, projectId],
  );
}
