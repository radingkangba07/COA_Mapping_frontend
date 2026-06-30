import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { usePlatform } from '@/shared/hooks/usePlatform';
import { colors } from '@/config/theme';
import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { ProjectId } from '@/shared/types/common.types';
import { SideNav } from '../components/SideNav';
import { TopAppBar } from '../components/TopAppBar';
import { StatCards } from '../components/StatCards';
import { WorkstreamSections } from '../components/WorkstreamSections';
import { ProjectSummaryPanel } from '../components/ProjectSummaryPanel';
import type { WorkstreamSectionGroup } from '../components/WorkstreamSections';
import type { NavKey } from '../components/SideNav';
import type { Workstream } from '../types/workstream.types';

type ProjectOverviewRoute = RouteProp<ProjectsStackParamList, 'ProjectOverview'>;
type ProjectOverviewNav = NativeStackNavigationProp<ProjectsStackParamList, 'ProjectOverview'>;

const OverviewSkeleton = (): React.JSX.Element => (
  <SafeAreaView className="flex-1 bg-background">
    <View className="p-6" style={{ gap: 12 }}>
      <Skeleton height={48} width="100%" borderRadius={8} />
      <Skeleton height={24} width="60%" borderRadius={8} />
      <Skeleton height={120} width="100%" borderRadius={8} />
      <Skeleton height={120} width="100%" borderRadius={8} />
    </View>
  </SafeAreaView>
);

export const ProjectOverviewScreen = (): React.JSX.Element => {
  const route = useRoute<ProjectOverviewRoute>();
  const navigation = useNavigation<ProjectOverviewNav>();
  const { projectId } = route.params;
  const [activeNav, setActiveNav] = useState<NavKey>('overview');
  const { breakpoint } = usePlatform();
  const isNarrow = breakpoint === 'sm' || breakpoint === 'md';

  const { project, isLoading } = useProjectDetail(projectId as ProjectId);

  // Placeholder groups — replaced when workstream data layer is wired
  const sectionGroups: readonly WorkstreamSectionGroup[] = [
    {
      key: 'master-data',
      title: 'Master Data',
      items: [
        { id: 'ws-1',  name: 'Chart of Accounts', projectId: 'MD-001', status: 'in_progress',     progress: 65,  currentStage: 'Mapping',     included: true  },
        { id: 'ws-2',  name: 'Customers',          projectId: 'MD-002', status: 'completed',       progress: 100, currentStage: 'Done',        included: true  },
        { id: 'ws-3',  name: 'Vendors',            projectId: 'MD-003', status: 'review_required', progress: 80,  currentStage: 'Validation',  included: true  },
        { id: 'ws-4',  name: 'Items',              projectId: 'MD-004', status: 'not_started',     progress: 0,   currentStage: 'Not Started', included: true  },
        { id: 'ws-5',  name: 'Locations',          projectId: 'MD-005', status: 'blocked',         progress: 30,  currentStage: 'Upload',      included: true  },
        { id: 'ws-6',  name: 'Contacts',           projectId: 'MD-006', status: 'not_started',     progress: 0,   currentStage: 'Not Started', included: false },
        { id: 'ws-7',  name: 'Vehicles',           projectId: 'MD-007', status: 'not_started',     progress: 0,   currentStage: 'Not Started', included: false },
        { id: 'ws-8',  name: 'Fixed Assets',       projectId: 'MD-008', status: 'in_progress',     progress: 45,  currentStage: 'ERP Select',  included: true  },
        { id: 'ws-9',  name: 'Equipment',          projectId: 'MD-009', status: 'not_started',     progress: 0,   currentStage: 'Not Started', included: false },
      ] as readonly Workstream[],
    },
    {
      key: 'opening-balances',
      title: 'Opening Balances',
      items: [
        { id: 'ob-1', name: 'Trial Balance',       projectId: 'OB-001', status: 'completed',       progress: 100, currentStage: 'Done',        included: true },
        { id: 'ob-2', name: 'Retained Earnings',   projectId: 'OB-002', status: 'in_progress',     progress: 55,  currentStage: 'Mapping',     included: true },
        { id: 'ob-3', name: 'Accounts Receivable', projectId: 'OB-003', status: 'review_required', progress: 75,  currentStage: 'Validation',  included: true },
        { id: 'ob-4', name: 'Accounts Payable',    projectId: 'OB-004', status: 'not_started',     progress: 0,   currentStage: 'Not Started', included: true },
        { id: 'ob-5', name: 'Inventory',           projectId: 'OB-005', status: 'not_started',     progress: 0,   currentStage: 'Not Started', included: true },
      ] as readonly Workstream[],
    },
  ];

  // Flat list for StatCards (all workstreams across all groups)
  const workstreams: readonly Workstream[] = sectionGroups.flatMap((g) => g.items);

  if (isLoading || project === null) {
    return <OverviewSkeleton />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 flex-row">
        {/* Left navigation rail */}
        <SideNav
          active={activeNav}
          onPress={setActiveNav}
          testID="project-overview-sidenav"
        />

        {/* Main content area */}
        <View className="flex-1 flex-col">
          <TopAppBar
            breadcrumb={['Projects', project.name]}
            status={project.status}
            sourceErp={project.sourceErp}
            targetErp={project.targetErp}
            projectId={project.projectId as string}
            onBack={() => navigation.goBack()}
            testID="project-overview-topbar"
          />

          {/* Responsive 2-column body */}
          <View className={isNarrow ? 'flex-col flex-1' : 'flex-row flex-1'}>
            {/* Scrollable main area */}
            <ScrollView
              className="flex-1 p-6"
              contentContainerStyle={{ flexGrow: 1, gap: 24 }}
              testID="project-overview-main"
            >
              <StatCards
                workstreams={workstreams}
                isLoading={isLoading}
                testID="project-overview-stat-cards"
              />
              <WorkstreamSections
                groups={sectionGroups}
                onOpen={(_w) => { /* navigation wired in Story 6 */ }}
                testID="project-overview-workstream-sections"
              />
            </ScrollView>

            {/* Right summary panel — DA-119 */}
            <View
              className="bg-surface"
              style={
                isNarrow
                  ? { borderTopWidth: 1, borderTopColor: colors.border }
                  : { width: 280, borderLeftWidth: 1, borderLeftColor: colors.border }
              }
            >
              <ProjectSummaryPanel
                project={project}
                groups={sectionGroups}
                testID="project-overview-summary-panel"
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
