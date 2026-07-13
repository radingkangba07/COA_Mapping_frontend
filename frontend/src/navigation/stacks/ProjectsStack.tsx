import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import type { ProjectsStackParamList } from '../types';
import { ProjectsScreen } from '@/features/projects/screens/ProjectsScreen';
import { NewProjectScreen } from '@/features/projects/screens/NewProjectScreen';
import { ProjectScopeScreen } from '@/features/projects/screens/ProjectScopeScreen';
import { ClientOrgsScreen } from '@/features/projects/screens/ClientOrgsScreen';
import { ClientOrgDetailScreen } from '@/features/projects/screens/ClientOrgDetailScreen';
import { ProjectOverviewScreen } from '@/features/project-overview/screens/ProjectOverviewScreen';
import { WorkstreamDetailScreen } from '@/features/project-overview/screens/WorkstreamDetailScreen';

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export const ProjectsStack = (): React.JSX.Element => (
  <ErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="NewProject" component={NewProjectScreen} options={{ title: 'New Project' }} />
      <Stack.Screen name="ProjectScope" component={ProjectScopeScreen} options={{ title: 'Create Data Migration Project' }} />
      <Stack.Screen name="ClientOrgs" component={ClientOrgsScreen} options={{ title: 'Client Workspaces' }} />
      <Stack.Screen name="ClientOrgDetail" component={ClientOrgDetailScreen} options={{ title: 'Client Workspace' }} />
      <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen} options={{ title: 'Project Overview' }} />
      <Stack.Screen name="WorkstreamDetail" component={WorkstreamDetailScreen} options={{ title: 'Workstream' }} />
    </Stack.Navigator>
  </ErrorBoundary>
);
