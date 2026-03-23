import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppTabs } from '../tabs/AppTabs';

type AppStackParamList = {
  Main: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

/** Wrapper stack around AppTabs for future modal screens. */
export const AppStack = (): React.JSX.Element => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main" component={AppTabs} />
  </Stack.Navigator>
);
