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
import type { NavKey } from '../components/SideNav';

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
            {/* Scrollable main area — stat tiles + workstream groups added by child stories */}
            <ScrollView
              className="flex-1 p-6"
              contentContainerStyle={{ flexGrow: 1 }}
              testID="project-overview-main"
            />

            {/* Fixed right summary panel — ProjectSummaryPanel added by Story 5 */}
            <View
              className="bg-surface p-4"
              style={
                isNarrow
                  ? { borderTopWidth: 1, borderTopColor: colors.border }
                  : { width: 280, borderLeftWidth: 1, borderLeftColor: colors.border }
              }
              testID="project-overview-summary-panel"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
