import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './stacks/AuthStack';
import { AppTabs } from './tabs/AppTabs';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { selectIsAuthenticated } from '@/features/auth/store/auth.selectors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = (): React.JSX.Element => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationTypeForReplace: 'push',
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};
