import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { colors } from '@/config/theme';
import { createOrgId, createCompanyId } from '@/shared/types/common.types';
import { useProjectsViewModel } from '../hooks/useProjectsViewModel';
import { ProjectList } from '../components/ProjectList';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { InviteMemberDialog } from '../components/InviteMemberDialog';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { Project, ProjectGroup } from '../types/projects.types';
import { STEP_TO_SCREEN, MIGRATION_STEPS } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

type ClientOrgDetailRoute = NativeStackScreenProps<ProjectsStackParamList, 'ClientOrgDetail'>['route'];
type ClientOrgDetailNav = NativeStackNavigationProp<ProjectsStackParamList, 'ClientOrgDetail'>;

export const ClientOrgDetailScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ClientOrgDetailNav>();
  const route = useRoute<ClientOrgDetailRoute>();
  const { clientOrgId } = route.params;

  const clientOrgIdTyped = createOrgId(clientOrgId);
  const clientCompanyId = createCompanyId(clientOrgId);

  const { projects, isLoading, error, refetch } = useProjectsViewModel(clientOrgIdTyped);
  const [projectDialogVisible, setProjectDialogVisible] = useState(false);
  const [inviteDialogVisible, setInviteDialogVisible] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleProjectPress = useCallback(
    (project: Project) => {
      const parent = navigation.getParent();
      if (parent !== undefined) {
        const step = (project.currentStep ?? MIGRATION_STEPS.ERP_SELECT) as MigrationStepValue;
        const screen = STEP_TO_SCREEN[step] ?? 'ERPSelect';
        parent.navigate('MigrationTab', {
          screen,
          params: { projectId: project.projectId },
        });
      }
    },
    [navigation],
  );

  const projectGroup: ProjectGroup[] = [
    { companyId: clientCompanyId, companyName: 'Projects', projects },
  ];

  if (error !== null && projects.length === 0) {
    return (
      <Screen testID="client-org-detail-screen">
        <Button variant="ghost" onPress={handleBack} className="mt-4 self-start">
          <View className="flex-row items-center gap-1">
            <ArrowLeft size={16} color={colors.foreground} />
            <Text className="text-sm font-medium text-foreground">Back</Text>
          </View>
        </Button>
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={refetch}
          testID="client-org-detail-error"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="client-org-detail-screen">
      <Button variant="ghost" onPress={handleBack} className="mt-4 mb-2 self-start">
        <View className="flex-row items-center gap-1">
          <ArrowLeft size={16} color={colors.foreground} />
          <Text className="text-sm font-medium text-foreground">Back</Text>
        </View>
      </Button>

      <View className="flex-row items-start justify-between pb-4">
        <View className="flex-1">
          <Text className="font-heading text-2xl font-bold text-foreground">
            Client Workspace
          </Text>
          <Text className="font-body text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onPress={() => setInviteDialogVisible(true)}
            testID="client-org-invite-btn"
          >
            Invite
          </Button>
          <Button
            size="sm"
            onPress={() => setProjectDialogVisible(true)}
            testID="client-org-new-project-btn"
          >
            New Project
          </Button>
        </View>
      </View>

      {isLoading && projects.length === 0 ? (
        <View className="gap-3">
          <Skeleton height={64} width="100%" borderRadius={8} />
          <Skeleton height={64} width="100%" borderRadius={8} />
        </View>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create the first project for this client workspace."
          action={{
            label: 'New Project',
            onPress: () => setProjectDialogVisible(true),
          }}
          testID="client-org-detail-empty"
        />
      ) : (
        <ProjectList
          groups={projectGroup}
          isRefreshing={isLoading}
          onRefresh={refetch}
          onProjectPress={handleProjectPress}
          onCreatePress={() => setProjectDialogVisible(true)}
          testID="client-org-projects-list"
        />
      )}

      <NewProjectDialog
        visible={projectDialogVisible}
        onClose={() => setProjectDialogVisible(false)}
        companyId={clientCompanyId}
        testID="client-org-new-project-dialog"
      />

      <InviteMemberDialog
        visible={inviteDialogVisible}
        onClose={() => setInviteDialogVisible(false)}
        orgType="client"
        testID="client-org-invite-dialog"
      />
    </Screen>
  );
};
