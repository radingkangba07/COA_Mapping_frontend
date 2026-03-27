import React, { useCallback, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { useProjectsViewModel } from '../hooks/useProjectsViewModel';
import { ProjectList } from '../components/ProjectList';
import { ProjectListSkeleton } from '../components/ProjectListSkeleton';
import { DashboardStats } from '../components/DashboardStats';
import { NewProjectDialog } from '../components/NewProjectDialog';
import type { Project, ProjectGroup } from '../types/projects.types';
import type { CompanyId } from '@/shared/types/common.types';
import type { ProjectsStackParamList } from '@/navigation/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProjectsNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupProjectsByCompany(projects: readonly Project[]): ProjectGroup[] {
  const map = new Map<string, { companyId: CompanyId | null; projects: Project[] }>();

  for (const project of projects) {
    const key = project.companyId ?? '__unassigned__';
    const existing = map.get(key);

    if (existing !== undefined) {
      existing.projects.push(project);
    } else {
      map.set(key, {
        companyId: project.companyId ?? null,
        projects: [project],
      });
    }
  }

  const groups: ProjectGroup[] = [];

  for (const [, entry] of map) {
    const sorted = [...entry.projects].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    groups.push({
      companyId: entry.companyId,
      companyName: entry.companyId ?? 'Unassigned',
      projects: sorted,
    });
  }

  groups.sort((a, b) => {
    if (a.companyId === null) return 1;
    if (b.companyId === null) return -1;
    return a.companyName.localeCompare(b.companyName);
  });

  return groups;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export const ProjectsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ProjectsNav>();
  const { projects, isLoading, error, refetch } = useProjectsViewModel();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogCompanyId, setDialogCompanyId] = useState<CompanyId | undefined>(
    undefined,
  );

  const groups = useMemo(() => groupProjectsByCompany(projects), [projects]);

  const totalProjects = projects.length;
  const totalCompanies = useMemo(
    () => new Set(projects.filter((p) => p.companyId !== undefined).map((p) => p.companyId)).size,
    [projects],
  );
  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === 'completed').length,
    [projects],
  );

  const handleProjectPress = useCallback(
    (project: Project) => {
      navigation.navigate('ProjectDetail', { projectId: project.projectId });
    },
    [navigation],
  );

  const handleCreateForCompany = useCallback((companyId: CompanyId | null) => {
    setDialogCompanyId(companyId ?? undefined);
    setDialogVisible(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogVisible(false);
    setDialogCompanyId(undefined);
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
        <ProjectListSkeleton testID="projects-skeleton" />
      </Screen>
    );
  }

  return (
    <Screen testID="projects-screen">
      <View className="px-4 py-4 md:px-0 md:py-6">
        <Text className="font-heading text-2xl font-bold text-foreground">
          Dashboard
        </Text>
      </View>

      <View className="px-4 mb-4">
        <DashboardStats
          totalProjects={totalProjects}
          totalCompanies={totalCompanies}
          completedProjects={completedProjects}
          testID="dashboard-stats"
        />
      </View>

      <ProjectList
        groups={groups}
        isRefreshing={isLoading}
        onRefresh={refetch}
        onProjectPress={handleProjectPress}
        onCreatePress={handleCreateForCompany}
        testID="projects-list"
      />

      <NewProjectDialog
        visible={dialogVisible}
        onClose={handleCloseDialog}
        companyId={dialogCompanyId}
        testID="new-project-dialog"
      />
    </Screen>
  );
};
