import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, View, type ListRenderItemInfo } from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { usePlatform } from '@/shared/hooks/usePlatform';
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

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

function getNumColumns(breakpoint: Breakpoint): number {
  if (breakpoint === 'lg' || breakpoint === 'xl') return 3;
  if (breakpoint === 'md') return 2;
  return 1;
}

const COLUMN_GAP = 12;
const ITEM_VERTICAL_GAP = 12;

export const ProjectList = ({
  projects,
  isRefreshing,
  onRefresh,
  onProjectPress,
  onCreatePress,
  testID,
}: ProjectListProps): React.JSX.Element => {
  const { breakpoint } = usePlatform();
  const numColumns = getNumColumns(breakpoint);
  const itemStyle = useMemo(() => ({ flex: 1 / numColumns }), [numColumns]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Project>) => (
      <View style={itemStyle}>
        <ProjectCard
          project={item}
          onPress={onProjectPress}
          testID={`project-card-${item.projectId}`}
        />
      </View>
    ),
    [onProjectPress, itemStyle],
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
      key={numColumns}
      data={projects}
      numColumns={numColumns}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: ITEM_VERTICAL_GAP }}
      {...(numColumns > 1 ? { columnWrapperStyle: { gap: COLUMN_GAP } } : {})}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      testID={testID}
    />
  );
};
