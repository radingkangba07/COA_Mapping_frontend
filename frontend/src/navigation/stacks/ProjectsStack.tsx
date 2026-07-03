import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import type { ProjectsStackParamList } from '../types';
import { ProjectsScreen } from '@/features/projects/screens/ProjectsScreen';
import { NewProjectScreen } from '@/features/projects/screens/NewProjectScreen';
import { ClientOrgsScreen } from '@/features/projects/screens/ClientOrgsScreen';
import { ClientOrgDetailScreen } from '@/features/projects/screens/ClientOrgDetailScreen';
const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export const ProjectsStack = (): React.JSX.Element => (
  <ErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="NewProject" component={NewProjectScreen} options={{ title: 'New Project' }} />
      <Stack.Screen name="ClientOrgs" component={ClientOrgsScreen} options={{ title: 'Client Workspaces' }} />
      <Stack.Screen name="ClientOrgDetail" component={ClientOrgDetailScreen} options={{ title: 'Client Workspace' }} />
    </Stack.Navigator>
  </ErrorBoundary>
);
