import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  View,
  Text,
  type SectionListData,
  type SectionListRenderItemInfo,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react-native';
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
const PAGE_SIZE = 10;

// ─── Table Header ──────────────────────────────────────────────────────────

const HEADER_COLUMNS = [
  { label: 'Name', flex: 3 },
  { label: 'Status', flex: 1.2 },
  { label: 'Migration Path', flex: 2.5 },
  { label: 'Created By', flex: 1.5 },
  { label: 'Updated', flex: 1.5 },
] as const;

function TableHeader(): React.JSX.Element {
  return (
    <View
      className="flex-row items-center border-b-2 border-border py-3 px-4"
      style={{ backgroundColor: colors.muted }}
    >
      {HEADER_COLUMNS.map((col) => (
        <View key={col.label} style={{ flex: col.flex }}>
          <Text className="font-heading text-xs font-semibold text-foreground uppercase tracking-wide">
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps): React.JSX.Element | null {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <View className="flex-row items-center justify-between border-t border-border px-4 py-3">
      <Text className="font-body text-xs text-muted-foreground">
        {start}–{end} of {totalItems}
      </Text>
      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-md border border-border p-1.5"
          style={{ opacity: currentPage <= 1 ? 0.4 : 1 }}
          hitSlop={4}
        >
          <ChevronLeft size={14} color={colors.mutedForeground} />
        </Pressable>
        <Text className="font-body text-xs text-muted-foreground px-2">
          {currentPage} / {totalPages}
        </Text>
        <Pressable
          onPress={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-md border border-border p-1.5"
          style={{ opacity: currentPage >= totalPages ? 0.4 : 1 }}
          hitSlop={4}
        >
          <ChevronRight size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function flattenProjects(groups: ProjectGroup[]): { project: Project; group: ProjectGroup }[] {
  const items: { project: Project; group: ProjectGroup }[] = [];
  for (const group of groups) {
    for (const project of group.projects) {
      items.push({ project, group });
    }
  }
  return items;
}

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

// ─── Web Path — Single table with grouped rows & pagination ────────────────

const WebProjectList = ({
  groups,
  isRefreshing,
  onRefresh,
  onProjectPress,
  testID,
}: ProjectListProps): React.JSX.Element => {
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Reset page when data changes
  const prevGroupsLen = React.useRef(groups.length);
  React.useEffect(() => {
    if (groups.length !== prevGroupsLen.current) {
      setCurrentPage(1);
      prevGroupsLen.current = groups.length;
    }
  }, [groups.length]);

  const allItems = useMemo(() => flattenProjects(groups), [groups]);
  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Paginate the flat list, then re-group for rendering
  const pagedGroups = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const pagedItems = allItems.slice(start, start + PAGE_SIZE);

    const groupMap = new Map<string, { group: ProjectGroup; projects: Project[] }>();
    for (const { project, group } of pagedItems) {
      const key = group.companyId ?? 'unassigned';
      const existing = groupMap.get(key);
      if (existing !== undefined) {
        existing.projects.push(project);
      } else {
        groupMap.set(key, { group, projects: [project] });
      }
    }

    return Array.from(groupMap.values()).map(({ group, projects }) => ({
      ...group,
      projects,
    }));
  }, [allItems, currentPage]);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      testID={testID}
    >
      <View className="rounded-lg border border-border overflow-hidden bg-card">
        <TableHeader />
        {pagedGroups.map((group) => {
          const groupKey = group.companyId ?? 'unassigned';
          const isExpanded = !collapsedGroups.has(groupKey);
          return (
            <View key={groupKey}>
              <CompanyGroupHeader
                companyName={group.companyName}
                companySlug={group.companyId}
                projectCount={group.projects.length}
                isExpanded={isExpanded}
                onToggle={() => toggleGroup(groupKey)}
                onCreatePress={() => {}}
                testID={`group-header-${groupKey}`}
              />
              {isExpanded && group.projects.map((project) => (
                <ProjectCard
                  key={project.projectId}
                  project={project}
                  onPress={onProjectPress}
                  testID={`project-card-${project.projectId}`}
                />
              ))}
            </View>
          );
        })}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </View>
    </ScrollView>
  );
};

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
      className="pt-2"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      stickySectionHeadersEnabled={false}
      testID={testID}
    />
  );
};
