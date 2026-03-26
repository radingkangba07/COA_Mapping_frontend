import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { colors } from '@/config/theme';
import { MigrationListScreen } from '@/features/migration/screens/MigrationListScreen';
import { ERPSelectScreen } from '@/features/migration/screens/ERPSelectScreen';
import { UploadScreen } from '@/features/migration/screens/UploadScreen';
import { MappingScreen } from '@/features/migration/screens/MappingScreen';
import { ValidationScreen } from '@/features/migration/screens/ValidationScreen';
import { PreviewScreen } from '@/features/migration/screens/PreviewScreen';
import type { MigrationStackParamList } from '../types';

const Stack = createNativeStackNavigator<MigrationStackParamList>();

export const MigrationStack = (): React.JSX.Element => {
  const headerStyle = { backgroundColor: colors.background } as const;
  const headerTintColor = colors.foreground;

  return (
    <ErrorBoundary>
      <Stack.Navigator
        screenOptions={{
          headerStyle,
          headerTintColor,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="MigrationList"
          component={MigrationListScreen}
          options={{ title: 'Migrations' }}
        />
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
    </ErrorBoundary>
  );
};
