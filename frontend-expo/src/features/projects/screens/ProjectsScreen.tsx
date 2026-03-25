import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { colors } from '@/config/theme';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { useProjectsViewModel } from '../hooks/useProjectsViewModel';
import { useOnlineGuard } from '@/shared/hooks/useOnlineGuard';
import { ProjectList } from '../components/ProjectList';
import { ProjectListSkeleton } from '../components/ProjectListSkeleton';
import { NewProjectDialog } from '../components/NewProjectDialog';
import type { Project } from '../types/projects.types';
import type { ProjectsStackParamList } from '@/navigation/types';

type ProjectsNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

export const ProjectsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ProjectsNav>();
  const { projects, isLoading, error, refetch } = useProjectsViewModel();
  const { isOnline } = useOnlineGuard();
  const [dialogVisible, setDialogVisible] = useState(false);

  const handleProjectPress = useCallback(
    (project: Project) => {
      navigation.navigate('ProjectDetail', { projectId: project.projectId });
    },
    [navigation],
  );

  const handleOpenDialog = useCallback(() => {
    setDialogVisible(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogVisible(false);
  }, []);

  if (error !== null && projects.length === 0) {
    return (
      <Screen testID="projects-screen">
        <NetworkErrorFallback
          error={new Error(error.message)}
          onRetry={refetch}
          testID="projects-error"
        />
      </Screen>
    );
  }

  if (isLoading && projects.length === 0) {
    return (
      <Screen testID="projects-screen">
        <View className="flex-row items-center justify-between px-4 py-4">
          <Skeleton height={28} className="w-40 rounded" />
          <Skeleton height={40} className="w-32 rounded-md" />
        </View>
        <ProjectListSkeleton testID="projects-skeleton" />
      </Screen>
    );
  }

  return (
    <Screen testID="projects-screen">
      <View className="flex-row items-center justify-between px-4 py-4 md:px-6">
        <Text className="font-heading text-2xl font-bold text-foreground">
          Your Projects
        </Text>
        <Button onPress={handleOpenDialog} disabled={!isOnline} accessibilityLabel="Create new project" testID="new-project-btn">
          <View className="flex-row items-center gap-1.5">
            <Plus size={16} color={colors.primaryForeground} />
            <Text className="text-sm font-medium text-primary-foreground">
              New Project
            </Text>
          </View>
        </Button>
      </View>

      <ProjectList
        projects={projects}
        isRefreshing={isLoading}
        onRefresh={refetch}
        onProjectPress={handleProjectPress}
        onCreatePress={handleOpenDialog}
        testID="projects-list"
      />

      <NewProjectDialog
        visible={dialogVisible}
        onClose={handleCloseDialog}
        testID="new-project-dialog"
      />
    </Screen>
  );
};
