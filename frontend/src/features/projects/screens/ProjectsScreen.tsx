import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '@/config/theme';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useProjectsViewModel } from '../hooks/useProjectsViewModel';
import { useOrgsViewModel } from '../hooks/useOrgsViewModel';
import { ProjectList } from '../components/ProjectList';
import { ProjectListSkeleton } from '../components/ProjectListSkeleton';
import { DashboardStats } from '../components/DashboardStats';
import { NewProjectDialog } from '../components/NewProjectDialog';
import type { Project, ProjectGroup } from '../types/projects.types';
import type { CompanyId } from '@/shared/types/common.types';
import type { ProjectsStackParamList } from '@/navigation/types';
import { STEP_TO_SCREEN, MIGRATION_STEPS } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProjectsNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectsList'>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupProjectsByCompany(
  projects: readonly Project[],
  orgNameMap: ReadonlyMap<string, string>,
): ProjectGroup[] {
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

  return unsorted.map((entry, idx) => ({
    companyId: entry.companyId,
    companyName: entry.companyId !== null
      ? orgNameMap.get(entry.companyId as string) ?? `Company ${String(idx + 1)}`
      : 'Unassigned',
    projects: entry.projects,
  }));
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export const ProjectsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<ProjectsNav>();
  const { projects, isLoading, error, refetch } = useProjectsViewModel();
  const { orgs } = useOrgsViewModel();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const orgNameMap = useMemo(
    () => new Map(orgs.map((o) => [o.id as string, o.name])),
    [orgs],
  );
  const groups = useMemo(() => groupProjectsByCompany(projects, orgNameMap), [projects, orgNameMap]);

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

  const handleCreateForCompany = useCallback((_companyId: CompanyId | null) => {
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
            onPress: () => setDialogVisible(true),
          }}
          testID="projects-empty"
        />
        <NewProjectDialog
          visible={dialogVisible}
          onClose={handleCloseDialog}
          testID="new-project-dialog"
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
          {totalProjects} total {'\u00B7'} {completedProjects} completed {'\u00B7'} {totalCompanies} {totalCompanies === 1 ? 'company' : 'companies'}
        </Text>
      </View>

      <DashboardStats totalProjects={totalProjects} totalCompanies={totalCompanies} completedProjects={completedProjects} testID="dashboard-stats" />

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
          onPress={() => setDialogVisible(true)}
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
        testID="new-project-dialog"
      />
    </Screen>
  );
};
