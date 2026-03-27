import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import type { ProjectsStackParamList } from '../types';
import { ProjectsScreen } from '@/features/projects/screens/ProjectsScreen';
import { ProjectDetailScreen } from '@/features/projects/screens/ProjectDetailScreen';
import { NewProjectScreen } from '@/features/projects/screens/NewProjectScreen';

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export const ProjectsStack = (): React.JSX.Element => (
  <ErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: 'Project Detail' }} />
      <Stack.Screen name="NewProject" component={NewProjectScreen} options={{ title: 'New Project' }} />
    </Stack.Navigator>
  </ErrorBoundary>
);
