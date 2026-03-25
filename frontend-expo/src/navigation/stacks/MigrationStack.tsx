import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@/config/theme';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { ERPSelectScreen } from '@/features/migration/screens/ERPSelectScreen';
import { UploadScreen } from '@/features/migration/screens/UploadScreen';
import type { MigrationStackParamList } from '../types';

const Stack = createNativeStackNavigator<MigrationStackParamList>();

const MappingScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Review Mappings" testID="mapping-screen" />
);

const ValidationScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Validation" testID="validation-screen" />
);

const PreviewScreen = (): React.JSX.Element => (
  <PlaceholderScreen name="Preview & Export" testID="preview-screen" />
);

const HEADER_STYLE = { backgroundColor: colors.background } as const;

export const MigrationStack = (): React.JSX.Element => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: HEADER_STYLE,
      headerTintColor: colors.foreground,
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="ERPSelect"
      component={ERPSelectScreen}
      options={{ title: 'Select ERP' }}
    />
    <Stack.Screen
      name="Upload"
      component={UploadScreen}
      options={{ title: 'Upload File' }}
    />
    <Stack.Screen
      name="Mapping"
      component={MappingScreen}
      options={{ title: 'Review Mappings' }}
    />
    <Stack.Screen
      name="Validation"
      component={ValidationScreen}
      options={{ title: 'Validation' }}
    />
    <Stack.Screen
      name="Preview"
      component={PreviewScreen}
      options={{ title: 'Preview & Export' }}
    />
  </Stack.Navigator>
);
