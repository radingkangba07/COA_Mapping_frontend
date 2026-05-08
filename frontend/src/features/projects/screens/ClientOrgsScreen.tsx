import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { selectActiveOrgId } from '@/shared/store/app.selectors';
import { useClientOrgs } from '../hooks/useClientOrgs';
import { ClientOrgCard } from '../components/ClientOrgCard';
import { CreateClientOrgDialog } from '../components/CreateClientOrgDialog';
import type { ClientOrg } from '../types/org.types';
import type { ProjectsStackParamList } from '@/navigation/types';

type ClientOrgsNav = NativeStackNavigationProp<ProjectsStackParamList, 'ClientOrgs'>;

export const ClientOrgsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ClientOrgsNav>();
  const activeOrgId = useAppStore(selectActiveOrgId);
  const { clientOrgs, isLoading, error, refetch } = useClientOrgs(activeOrgId);
  const [createVisible, setCreateVisible] = useState(false);

  const handleCardPress = useCallback(
    (clientOrg: ClientOrg) => {
      navigation.navigate('ClientOrgDetail', { clientOrgId: clientOrg.id });
    },
    [navigation],
  );

  if (error !== null && clientOrgs.length === 0) {
    return (
      <Screen testID="client-orgs-screen">
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={refetch}
          testID="client-orgs-error"
        />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen testID="client-orgs-screen">
        <View className="gap-3 pt-4">
          <Skeleton height={80} width="100%" borderRadius={8} />
          <Skeleton height={80} width="100%" borderRadius={8} />
          <Skeleton height={80} width="100%" borderRadius={8} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="client-orgs-screen">
      <View className="flex-row items-start justify-between pt-6 pb-4">
        <View className="flex-1">
          <Text className="font-heading text-2xl font-bold text-foreground">
            Client Workspaces
          </Text>
          <Text className="font-body text-sm text-muted-foreground mt-0.5">
            {clientOrgs.length} {clientOrgs.length === 1 ? 'client' : 'clients'}
          </Text>
        </View>
        {activeOrgId !== null && (
          <Button
            size="sm"
            onPress={() => setCreateVisible(true)}
            testID="create-client-org-btn"
          >
            <View className="flex-row items-center gap-1.5">
              <Plus size={14} color={colors.primaryForeground} />
              <Text className="text-xs font-medium text-primary-foreground">New Client</Text>
            </View>
          </Button>
        )}
      </View>

      {clientOrgs.length === 0 ? (
        <EmptyState
          title="No client workspaces yet"
          description="Create a client workspace to manage COA migrations on behalf of a client."
          action={{
            label: 'New Client',
            onPress: () => setCreateVisible(true),
          }}
          testID="client-orgs-empty"
        />
      ) : (
        <View className="gap-3">
          {clientOrgs.map((org) => (
            <ClientOrgCard
              key={org.id}
              clientOrg={org}
              onPress={handleCardPress}
              testID={`client-org-card-${org.id}`}
            />
          ))}
        </View>
      )}

      {activeOrgId !== null && (
        <CreateClientOrgDialog
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          parentOrgId={activeOrgId}
          testID="create-client-org-dialog"
        />
      )}
    </Screen>
  );
};
