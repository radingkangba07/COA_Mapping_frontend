import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import {
  useAppNavigation,
  useAppDrawerNavigation,
  useSettingsNavigation,
  useMigrationScreenRoute,
} from '../types';

// ─── useAppNavigation ───────────────────────────────────────────────────────

describe('useAppNavigation', () => {
  it('returns the ambient navigation object (typed for RootStackParamList)', async () => {
    const captured: { current: ReturnType<typeof useAppNavigation> | null } = { current: null };
    function Probe(): React.JSX.Element {
      captured.current = useAppNavigation();
      return <View testID="probe" />;
    }
    const Stack = createNativeStackNavigator();

    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Probe" component={Probe} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => expect(screen.getByTestId('probe')).toBeTruthy());
    expect(typeof captured.current?.navigate).toBe('function');
  });
});

// ─── useAppDrawerNavigation ─────────────────────────────────────────────────

describe('useAppDrawerNavigation', () => {
  it('returns the ambient navigation object (typed for AppTabsParamList/drawer)', async () => {
    const captured: { current: ReturnType<typeof useAppDrawerNavigation> | null } = { current: null };
    function Probe(): React.JSX.Element {
      captured.current = useAppDrawerNavigation();
      return <View testID="probe" />;
    }
    const Stack = createNativeStackNavigator();

    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Probe" component={Probe} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => expect(screen.getByTestId('probe')).toBeTruthy());
    expect(typeof captured.current?.navigate).toBe('function');
  });
});

// ─── useSettingsNavigation ──────────────────────────────────────────────────

describe('useSettingsNavigation', () => {
  it('returns the ambient navigation object (typed for SettingsStackParamList)', async () => {
    const captured: { current: ReturnType<typeof useSettingsNavigation> | null } = { current: null };
    function Probe(): React.JSX.Element {
      captured.current = useSettingsNavigation();
      return <View testID="probe" />;
    }
    const Stack = createNativeStackNavigator();

    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Probe" component={Probe} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => expect(screen.getByTestId('probe')).toBeTruthy());
    expect(typeof captured.current?.navigate).toBe('function');
  });
});

// ─── useMigrationScreenRoute ────────────────────────────────────────────────

describe('useMigrationScreenRoute', () => {
  it('returns this screen\'s own route, name and params included', async () => {
    function UploadProbe(): React.JSX.Element {
      const route = useMigrationScreenRoute<'Upload'>();
      return (
        <View testID="probe">
          <Text testID="route-name">{route.name}</Text>
          <Text testID="project-id">{route.params.projectId}</Text>
        </View>
      );
    }
    const Stack = createNativeStackNavigator();

    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Upload" component={UploadProbe} initialParams={{ projectId: 'proj-1' }} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => expect(screen.getByTestId('probe')).toBeTruthy());
    expect(screen.getByTestId('route-name').props.children).toBe('Upload');
    expect(screen.getByTestId('project-id').props.children).toBe('proj-1');
  });

  it('reflects different params for a different route (Mapping vs Upload)', async () => {
    function MappingProbe(): React.JSX.Element {
      const route = useMigrationScreenRoute<'Mapping'>();
      return (
        <View testID="probe">
          <Text testID="project-id">{route.params.projectId}</Text>
        </View>
      );
    }
    const Stack = createNativeStackNavigator();

    render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Mapping" component={MappingProbe} initialParams={{ projectId: 'proj-2' }} />
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => expect(screen.getByTestId('probe')).toBeTruthy());
    expect(screen.getByTestId('project-id').props.children).toBe('proj-2');
  });
});
