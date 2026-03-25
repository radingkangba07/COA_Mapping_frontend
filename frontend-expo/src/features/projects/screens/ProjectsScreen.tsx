import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { colors } from '@/config/theme';
import { useProjectsViewModel } from '../hooks/useProjectsViewModel';
import { ProjectList } from '../components/ProjectList';
import { NewProjectDialog } from '../components/NewProjectDialog';
import type { Project } from '../types/projects.types';
import type { ProjectsStackParamList } from '@/navigation/types';

type ProjectsNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

export const ProjectsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ProjectsNav>();
  const { projects, isLoading, refetch } = useProjectsViewModel();
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

  if (isLoading && projects.length === 0) {
    return (
      <Screen testID="projects-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="projects-screen">
      <View className="flex-row items-center justify-between px-4 py-4">
        <Text className="font-heading text-2xl font-bold text-foreground">
          Your Projects
        </Text>
        <Button onPress={handleOpenDialog} testID="new-project-btn">
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
