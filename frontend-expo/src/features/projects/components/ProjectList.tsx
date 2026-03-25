import React, { useCallback } from 'react';
import { FlatList, RefreshControl, type ListRenderItemInfo } from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { colors } from '@/config/theme';
import { ProjectCard } from './ProjectCard';
import type { Project } from '../types/projects.types';

interface ProjectListProps {
  projects: Project[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onProjectPress: (project: Project) => void;
  onCreatePress?: () => void;
  testID?: string;
}

const EMPTY_ICON = <FolderOpen size={48} color={colors.mutedForeground} />;

export const ProjectList = ({
  projects,
  isRefreshing,
  onRefresh,
  onProjectPress,
  onCreatePress,
  testID,
}: ProjectListProps): React.JSX.Element => {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Project>) => (
      <ProjectCard
        project={item}
        onPress={onProjectPress}
        testID={`project-card-${item.projectId}`}
      />
    ),
    [onProjectPress],
  );

  const keyExtractor = useCallback(
    (item: Project) => item.projectId,
    [],
  );

  if (projects.length === 0 && !isRefreshing) {
    return (
      <EmptyState
        icon={EMPTY_ICON}
        title="No projects yet"
        description="Create your first COA migration project to get started"
        action={onCreatePress !== undefined ? { label: 'New Project', onPress: onCreatePress } : undefined}
        testID="projects-empty-state"
      />
    );
  }

  return (
    <FlatList
      data={projects}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      testID={testID}
    />
  );
};
