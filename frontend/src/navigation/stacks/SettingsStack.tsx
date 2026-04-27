import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import type { SettingsStackParamList } from '../types';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MembersScreen } from '@/features/projects/screens/MembersScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsStack = (): React.JSX.Element => (
  <ErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Members" component={MembersScreen} options={{ title: 'Members' }} />
    </Stack.Navigator>
  </ErrorBoundary>
);
