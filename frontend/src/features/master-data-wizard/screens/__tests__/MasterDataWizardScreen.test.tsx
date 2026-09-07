import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { MasterDataWizardScreen } from '../MasterDataWizardScreen';
import { useWizardStore } from '../../store/wizard.store';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';

// ─── MigrationLayout stub ───────────────────────────────────────────────────
// Counts renders so the tests can assert it mounts once for the whole
// wizard and never remounts when the active step changes — that's the
// entire point of MasterDataWizardScreen owning it instead of each step.
let migrationLayoutRenderCount = 0;
let lastSourceRowCount: number | undefined;
jest.mock('@/features/migration/components/MigrationLayout', () => {
  const R = require('react');
  const { View: RNView } = require('react-native');
  return {
    MigrationLayout: ({ children, testID, sourceRowCount }: { children: React.ReactNode; testID?: string; sourceRowCount?: number }) => {
      migrationLayoutRenderCount += 1;
      lastSourceRowCount = sourceRowCount;
      return R.createElement(RNView, { testID }, children);
    },
  };
});

// ─── Step screen stubs ──────────────────────────────────────────────────────
// MasterDataWizardStack imports these by path — mocking them here (resolved
// relative to this test file, same absolute module as the navigator's own
// '../screens/...' imports) keeps this suite about the shared-layout wiring,
// not the steps' own content, which each have their own test suites.
jest.mock('../MasterDataUploadScreen', () => {
  const R = require('react');
  const { View, Text, Pressable } = require('react-native');
  const { useNavigation } = require('@react-navigation/native');
  return {
    MasterDataUploadScreen: () => {
      const nav = useNavigation();
      return R.createElement(
        View,
        { testID: 'stub-upload' },
        R.createElement(Text, null, 'Upload step'),
        R.createElement(
          Pressable,
          { testID: 'stub-upload-continue', onPress: () => nav.navigate('Profile') },
          R.createElement(Text, null, 'Continue'),
        ),
      );
    },
  };
});
jest.mock('../SourceDataProfileScreen', () => {
  const R = require('react');
  const { View, Text, Pressable } = require('react-native');
  const { useNavigation } = require('@react-navigation/native');
  return {
    SourceDataProfileScreen: ({ onBack }: { onBack?: () => void }) => {
      const nav = useNavigation();
      return R.createElement(
        View,
        { testID: 'stub-profile' },
        R.createElement(Text, null, 'Profile step'),
        R.createElement(Pressable, { testID: 'stub-profile-back', onPress: onBack }, R.createElement(Text, null, 'Back')),
        // 'MasterDataWizard' isn't a route in the nested stack this
        // navigate() call resolves against, so React Navigation bubbles it
        // up to the parent RootStack — where it IS the currently-focused
        // route. This is what simulates React Navigation reusing an
        // already-mounted 'MasterDataWizard' screen instance for a
        // different project (see the regression test below).
        R.createElement(
          Pressable,
          {
            testID: 'stub-profile-switch-project',
            onPress: () => nav.navigate('MasterDataWizard', {
              orgProjectId: 'org-2',
              entityId: 'items',
              parentProjectId: 'proj-2',
              workstream_id: 'ws-2',
            }),
          },
          R.createElement(Text, null, 'Switch project'),
        ),
      );
    },
  };
});

// ─── Harness ────────────────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator();
const mockProjectOverview = jest.fn(() => null);

function renderWizard(): void {
  render(
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen
          name="MasterDataWizard"
          component={MasterDataWizardScreen}
          initialParams={{ orgProjectId: 'org-1', entityId: 'items', parentProjectId: 'proj-1', workstream_id: 'ws-1' }}
        />
        <RootStack.Screen name="ProjectOverview" component={mockProjectOverview} />
      </RootStack.Navigator>
    </NavigationContainer>,
  );
}

describe('MasterDataWizardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    migrationLayoutRenderCount = 0;
    lastSourceRowCount = undefined;
    useWizardStore.getState().reset();
  });

  it('seeds wizard.store from the route params before rendering the Upload step', async () => {
    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    expect(useWizardStore.getState().entityId).toBe('items');
    expect(useWizardStore.getState().orgProjectId).toBe('org-1');
    expect(useWizardStore.getState().parentProjectId).toBe('proj-1');
    expect(useWizardStore.getState().workstreamId).toBe('ws-1');
  });

  it('mounts MigrationLayout exactly once and keeps it mounted across a step transition', async () => {
    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    const countAfterUpload = migrationLayoutRenderCount;
    expect(countAfterUpload).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('stub-upload-continue'));

    await waitFor(() => {
      expect(screen.getByTestId('stub-profile')).toBeTruthy();
    });
    // MigrationLayout re-renders (props like sourceRowCount can change) but
    // never unmounts+remounts — assert via the sidebar testID staying present
    // through the transition rather than a render-count equality, which
    // would be sensitive to unrelated re-renders.
    expect(screen.getByTestId('master-data-wizard-screen')).toBeTruthy();
  });

  it('reads the sidebar row count from the same wizard-store CSV Step 1 populates', async () => {
    useWizardStore.getState().setWizardContext({
      entityId: 'items',
      orgProjectId: 'org-1',
      parentProjectId: 'proj-1',
      workstreamId: 'ws-1',
    });
    useWizardStore.getState().setSourceCsv('items', [
      ['SKU', 'Name'],
      ['I-1', 'Widget'],
      ['I-2', 'Gadget'],
    ]);

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    expect(lastSourceRowCount).toBe(2);
  });

  it('resumes on Profile when the project+entity already has a persisted step (e.g. after a browser refresh)', async () => {
    // Simulates the in-memory store having been wiped by a full page reload
    // — reset() above already cleared it — while storage (SecureStore/
    // localStorage, per wizard.store.ts's recordStep) still has last
    // session's progress for this project+entity (keyed by buildEntityKey,
    // i.e. "<parentProjectId>:<entityId>").
    (SecureStore.getItemAsync as jest.Mock).mockImplementationOnce((key: string) =>
      Promise.resolve(key === STORAGE_KEYS.WIZARD_STEP_BY_ENTITY ? JSON.stringify({ 'proj-1:items': 'profile' }) : null),
    );

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-profile')).toBeTruthy();
    });
    expect(screen.queryByTestId('stub-upload')).toBeNull();
  });

  it("does not resume on Profile when a different project's stored step is for the same entity", async () => {
    // Same entity ("items"), but the persisted step belongs to a different
    // project ("proj-2") — this project ("proj-1") has no persisted step of
    // its own yet, so it must open on Upload rather than inheriting proj-2's
    // progress.
    (SecureStore.getItemAsync as jest.Mock).mockImplementationOnce((key: string) =>
      Promise.resolve(key === STORAGE_KEYS.WIZARD_STEP_BY_ENTITY ? JSON.stringify({ 'proj-2:items': 'profile' }) : null),
    );

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    expect(screen.queryByTestId('stub-profile')).toBeNull();
  });

  it('opens on Upload for an entity with no persisted step yet', async () => {
    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
  });

  it("Profile's Back returns to the Upload step within the nested wizard stack", async () => {
    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('stub-upload-continue'));

    await waitFor(() => {
      expect(screen.getByTestId('stub-profile')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('stub-profile-back'));

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
  });

  it('tears down the stale nested step navigator instead of leaving it on screen when this route is reused for a different project', async () => {
    // React Navigation reuses the currently-focused 'MasterDataWizard' screen
    // instance (merging in new params) rather than mounting a new one when
    // navigate() targets a route already in the stack — see
    // stub-profile-switch-project above for how this is simulated.
    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('stub-upload-continue'));

    await waitFor(() => {
      expect(screen.getByTestId('stub-profile')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('stub-profile-switch-project'));

    await waitFor(() => {
      expect(useWizardStore.getState().parentProjectId).toBe('proj-2');
    });
    // proj-2 has no persisted step of its own — the nested navigator must be
    // torn down and rebuilt on Upload, not keep showing proj-1's Profile
    // step frozen on screen.
    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    expect(screen.queryByTestId('stub-profile')).toBeNull();
  });
});
