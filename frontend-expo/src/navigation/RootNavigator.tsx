import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './stacks/AuthStack';
import { AppTabs } from './tabs/AppTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Stub until features/auth/store/auth.store.ts is created
const IS_AUTHENTICATED_STUB = false;

export const RootNavigator = (): React.JSX.Element => {
  const isAuthenticated = IS_AUTHENTICATED_STUB;

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
