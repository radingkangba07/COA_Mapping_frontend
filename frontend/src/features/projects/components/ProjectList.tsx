import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  SectionList,
  View,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import { FolderOpen } from 'lucide-react-native';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { usePlatform } from '@/shared/hooks/usePlatform';
import { colors } from '@/config/theme';
import { CompanyGroupHeader } from './CompanyGroupHeader';
import { ProjectCard } from './ProjectCard';
import type { Project, ProjectGroup } from '../types/projects.types';
import type { CompanyId } from '@/shared/types/common.types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectListProps {
  groups: ProjectGroup[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onProjectPress: (project: Project) => void;
  onCreatePress: (companyId: CompanyId | null) => void;
  testID?: string;
}

interface ProjectSection {
  companyId: CompanyId | null;
  companyName: string;
  data: Project[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EMPTY_ICON = <FolderOpen size={48} color={colors.mutedForeground} />;

// ─── Component ──────────────────────────────────────────────────────────────

export const ProjectList = ({
  groups,
  isRefreshing,
  onRefresh,
  onProjectPress,
  onCreatePress,
  testID,
}: ProjectListProps): React.JSX.Element => {
  const { isWeb } = usePlatform();

  const handleEmptyCreate = useCallback(() => {
    onCreatePress(null);
  }, [onCreatePress]);

  if (groups.length === 0 && !isRefreshing) {
    return (
      <EmptyState
        icon={EMPTY_ICON}
        title="No projects yet"
        description="Create your first COA migration project to get started"
        action={{ label: 'New Project', onPress: handleEmptyCreate }}
        testID="projects-empty-state"
      />
    );
  }

  if (isWeb) {
    return (
      <WebProjectList
        groups={groups}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onProjectPress={onProjectPress}
        onCreatePress={onCreatePress}
        testID={testID}
      />
    );
  }

  return (
    <MobileProjectList
      groups={groups}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      onProjectPress={onProjectPress}
      onCreatePress={onCreatePress}
      testID={testID}
    />
  );
};

// ─── Web Path ───────────────────────────────────────────────────────────────

const WebProjectList = ({
  groups,
  isRefreshing,
  onRefresh,
  onProjectPress,
  onCreatePress,
  testID,
}: ProjectListProps): React.JSX.Element => (
  <ScrollView
    className="px-4 pt-2"
    refreshControl={
      <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
    }
    testID={testID}
  >
    {groups.map((group, index) => (
      <View key={group.companyId ?? 'unassigned'} className={index > 0 ? 'mt-6' : ''}>
        <CompanyGroupHeader
          companyName={group.companyName}
          companySlug={group.companyId}
          projectCount={group.projects.length}
          onCreatePress={() => onCreatePress(group.companyId)}
          testID={`group-header-${group.companyId ?? 'unassigned'}`}
        />
        {group.projects.map((project) => (
          <ProjectCard
            key={project.projectId}
            project={project}
            onPress={onProjectPress}
            testID={`project-card-${project.projectId}`}
          />
        ))}
      </View>
    ))}
  </ScrollView>
);

// ─── Mobile Path ────────────────────────────────────────────────────────────

const MobileProjectList = ({
  groups,
  isRefreshing,
  onRefresh,
  onProjectPress,
  onCreatePress,
  testID,
}: ProjectListProps): React.JSX.Element => {
  const sections = useMemo(
    () => groups.map((group): ProjectSection => ({
      companyId: group.companyId,
      companyName: group.companyName,
      data: [...group.projects],
    })),
    [groups],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Project, ProjectSection> }) => (
      <CompanyGroupHeader
        companyName={section.companyName}
        companySlug={section.companyId}
        projectCount={section.data.length}
        onCreatePress={() => onCreatePress(section.companyId)}
        testID={`group-header-${section.companyId ?? 'unassigned'}`}
      />
    ),
    [onCreatePress],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<Project, ProjectSection>) => (
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

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      className="px-4 pt-2"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      stickySectionHeadersEnabled={false}
      testID={testID}
    />
  );
};
