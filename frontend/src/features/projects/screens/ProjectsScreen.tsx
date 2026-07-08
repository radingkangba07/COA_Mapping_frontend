import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueries } from '@tanstack/react-query';
import { colors } from '@/config/theme';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useProjectsViewModel } from '../hooks/useProjectsViewModel';
import { useOrgsViewModel } from '../hooks/useOrgsViewModel';
import { getProjects } from '../services/projects.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { ProjectList } from '../components/ProjectList';
import { ProjectListSkeleton } from '../components/ProjectListSkeleton';
import { DashboardStats } from '../components/DashboardStats';
import type { Project, ProjectGroup } from '../types/projects.types';
import type { CompanyId } from '@/shared/types/common.types';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { Org } from '../types/org.types';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProjectsNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupProjectsByCompany(
  projects: readonly Project[],
  orgNameMap: ReadonlyMap<string, string>,
  clientOrgIds: ReadonlySet<string>,
  activeClientCompanyId: CompanyId | null,
): ProjectGroup[] {
  const map = new Map<string, { companyId: CompanyId | null; projects: Project[] }>();

  for (const project of projects) {
    const fallbackCompanyId =
      project.orgId !== undefined && clientOrgIds.has(project.orgId as string)
        ? (project.orgId as string as CompanyId)
        : activeClientCompanyId;
    const companyId = project.companyId ?? fallbackCompanyId;
    const key = companyId ?? '__unassigned__';
    const existing = map.get(key);

    if (existing !== undefined) {
      existing.projects.push(project);
    } else {
      map.set(key, {
        companyId,
        projects: [project],
      });
    }
  }

  // Build groups without names first, then sort by companyId, then assign stable names
  const unsorted: { companyId: CompanyId | null; projects: Project[] }[] = [];

  for (const [, entry] of map) {
    const sorted = [...entry.projects].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
    unsorted.push({ companyId: entry.companyId, projects: sorted });
  }

  // Sort: companies by ID (deterministic), unassigned last
  unsorted.sort((a, b) => {
    if (a.companyId === null) return 1;
    if (b.companyId === null) return -1;
    return (a.companyId as string).localeCompare(b.companyId as string);
  });

  return unsorted.map((entry) => ({
    companyId: entry.companyId,
    companyName: entry.companyId !== null
      ? orgNameMap.get(entry.companyId as string) ?? (entry.companyId as string)
      : 'Unassigned',
    projects: entry.projects,
  }));
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export const ProjectsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ProjectsNav>();
  const { projects, total, isLoading, error, refetch } = useProjectsViewModel();
  const { orgs, clientOrgs, activeOrg, activeOrgType } = useOrgsViewModel();
  const [searchQuery, setSearchQuery] = useState('');
  const showProjectBreakdown = activeOrgType === 'employer';

  const clientProjectTotalQueries = useQueries({
    queries: clientOrgs.map((org) => ({
      queryKey: ['projects', org.id, 'total'] as const,
      enabled: showProjectBreakdown,
      queryFn: async (): Promise<number> => {
        const result = await getProjects(httpClient, 0, 1, org.id);
        if (!result.ok) throw result.error;
        return result.data.total;
      },
    })),
  });

  const orgNameMap = useMemo(
    () => new Map(orgs.map((o) => [o.id as string, o.name])),
    [orgs],
  );
  const clientOrgIds = useMemo(
    () => {
      const ids = new Set(clientOrgs.map((o: Org) => o.id as string));
      if (activeOrgType === 'client' && activeOrg !== null) {
        ids.add(activeOrg.id as string);
      }
      return ids;
    },
    [activeOrg, activeOrgType, clientOrgs],
  );
  const activeClientCompanyId = useMemo(
    () => activeOrgType === 'client' && activeOrg !== null
      ? (activeOrg.id as string as CompanyId)
      : null,
    [activeOrg, activeOrgType],
  );
  const groups = useMemo(
    () => groupProjectsByCompany(projects, orgNameMap, clientOrgIds, activeClientCompanyId),
    [projects, orgNameMap, clientOrgIds, activeClientCompanyId],
  );
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) return groups;

    return groups
      .map((group) => ({
        ...group,
        projects: group.projects.filter((project) => {
          const source = [
            project.name,
            project.sourceErp,
            project.targetErp,
            project.status,
            project.createdByName,
            project.updatedByName,
            group.companyName,
          ]
            .filter((value): value is string => value !== undefined)
            .join(' ')
            .toLowerCase();
          return source.includes(query);
        }),
      }))
      .filter((group) => group.projects.length > 0);
  }, [groups, searchQuery]);

  const employerProjectCount = showProjectBreakdown ? total : projects.length;
  const clientProjectCount = showProjectBreakdown
    ? clientProjectTotalQueries.reduce((sum, query) => sum + (query.data ?? 0), 0)
    : 0;
  const totalProjects = showProjectBreakdown
    ? employerProjectCount + clientProjectCount
    : total;
  const totalCompanies = useMemo(
    () => activeOrgType === 'employer'
      ? clientOrgs.length
      : groups.filter((group) => group.companyId !== null).length,
    [activeOrgType, clientOrgs.length, groups],
  );
  const completedProjects = useMemo(
    () => projects.filter((p) => p.status === 'completed').length,
    [projects],
  );

  const handleProjectPress = useCallback(
    (project: Project) => {
      navigation.navigate('ProjectOverview', { projectId: project.projectId as string });
    },
    [navigation],
  );

  const handleNewProject = useCallback(() => {
    navigation.navigate('ProjectScope');
  }, [navigation]);

  const handleCreateForCompany = useCallback(
    (companyId: CompanyId | null) => {
      navigation.navigate(
        'ProjectScope',
        companyId !== null ? { companyId } : undefined,
      );
    },
    [navigation],
  );

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

  if (!isLoading && projects.length === 0) {
    return (
      <Screen testID="projects-screen">
        <EmptyState
          title="No projects yet"
          description="Create your first project to start migrating your chart of accounts."
          action={{
            label: 'New Project',
            onPress: handleNewProject,
          }}
          testID="projects-empty"
        />
      </Screen>
    );
  }

  return (
    <Screen testID="projects-screen">
      {/* Page header */}
      <View className="pt-5 pb-2">
        <Text className="font-heading text-xl font-bold text-foreground">
          Dashboard
        </Text>
        <Text className="font-body text-xs text-muted-foreground mt-0.5">
          {searchQuery.trim().length > 0
            ? `${filteredGroups.reduce((sum, group) => sum + group.projects.length, 0)} found · `
            : ''}
          {totalProjects} total {'\u00B7'} {completedProjects} completed {'\u00B7'} {totalCompanies} {totalCompanies === 1 ? 'company' : 'companies'}
        </Text>
      </View>

      <DashboardStats
        totalProjects={totalProjects}
        employerProjects={showProjectBreakdown ? employerProjectCount : undefined}
        clientProjects={showProjectBreakdown ? clientProjectCount : undefined}
        totalCompanies={totalCompanies}
        completedProjects={completedProjects}
        testID="dashboard-stats"
      />

      {/* Actions row: Search left, Create right */}
      <View className="flex-row items-center justify-between pt-2 pb-4">
        <View className="flex-row items-center rounded-md border border-border bg-background px-3" style={{ width: 240 }}>
          <Search size={14} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search projects..."
            placeholderTextColor={colors.mutedForeground}
            className="flex-1 h-8 ml-2 font-body text-sm text-foreground focus:outline-none"
            testID="projects-search-input"
          />
        </View>
        <Button
          onPress={handleNewProject}
          size="sm"
          testID="new-project-btn"
        >
          <View className="flex-row items-center gap-1.5">
            <Plus size={14} color={colors.primaryForeground} />
            <Text className="text-xs font-medium text-primary-foreground">
              Create
            </Text>
          </View>
        </Button>
      </View>

      {/* Project table */}
      <ProjectList
        groups={filteredGroups}
        isRefreshing={isLoading}
        onRefresh={refetch}
        onProjectPress={handleProjectPress}
        onCreatePress={handleCreateForCompany}
        testID="projects-list"
      />
    </Screen>
  );
};
