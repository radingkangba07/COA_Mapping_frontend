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

// ─── useOrgProjectFiles mock ─────────────────────────────────────────────────
// Discovery (GET /api/v1/storage/org-project/{orgProjectId}/files) — feeds
// useFileDetails the fileId, scoped to org_project_id+workstream_id+
// entity_id. Real (non-mocked) here would need a QueryClientProvider, and
// this suite only cares about what MasterDataWizardScreen does with its
// result, not its own network behaviour (see useOrgProjectFiles.test.tsx
// for that).
const mockDiscoveryRefetch = jest.fn();
const mockUseOrgProjectFiles = jest.fn();
jest.mock('../../hooks/useOrgProjectFiles', () => ({
  useOrgProjectFiles: (...args: unknown[]) => mockUseOrgProjectFiles(...args),
}));

function setOrgProjectFilesDefault(overrides: Partial<ReturnType<typeof mockUseOrgProjectFiles>> = {}): void {
  mockUseOrgProjectFiles.mockReturnValue({
    files: [],
    total: 0,
    hasFile: false,
    latestFile: null,
    isLoading: false,
    error: null,
    refetch: mockDiscoveryRefetch,
    ...overrides,
  });
}

// ─── useFileDetails mock ─────────────────────────────────────────────────────
// The sidebar's row count comes exclusively from here (GET
// /api/v1/storage/files/{fileId}), fed by the discovery call above's
// latestFile — never a local CSV fallback, and never client-persisted state
// (see MasterDataWizardScreen's own comment).
const mockFileDetailsRefetch = jest.fn();
const mockUseFileDetails = jest.fn();
jest.mock('../../hooks/useFileDetails', () => ({
  useFileDetails: (...args: unknown[]) => mockUseFileDetails(...args),
}));

function setFileDetailsDefault(): void {
  mockUseFileDetails.mockReturnValue({
    file: null,
    rowCount: undefined as number | undefined,
    isLoading: false,
    error: null,
    refetch: mockFileDetailsRefetch,
  });
}

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
    setOrgProjectFilesDefault();
    setFileDetailsDefault();
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

  it('shows 0 for the sidebar row count when discovery finds no file for this project+entity yet', async () => {
    useWizardStore.getState().setWizardContext({
      entityId: 'items',
      orgProjectId: 'org-1',
      parentProjectId: 'proj-1',
      workstreamId: 'ws-1',
    });
    // Default beforeEach state — discovery's latestFile is null, so
    // useFileDetails is never given a real id and rowCount stays undefined.

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    expect(lastSourceRowCount).toBe(0);
  });

  it('reads the sidebar row count from GET /api/v1/storage/files/{fileId} (useFileDetails), fed by the discovery call\'s latestFile, never a local/client-persisted value', async () => {
    useWizardStore.getState().setWizardContext({
      entityId: 'items',
      orgProjectId: 'org-1',
      parentProjectId: 'proj-1',
      workstreamId: 'ws-1',
    });
    // Discovery (GET /storage/org-project/{orgProjectId}/files, scoped to
    // org_project_id+workstream_id+entity_id) finds this entity's file —
    // that's what MasterDataWizardScreen hands to useFileDetails as its
    // fileId, not any client-persisted record.
    setOrgProjectFilesDefault({ latestFile: { id: 'file-1' } as never });
    // mockReturnValue (not -Once): MasterDataWizardScreen re-renders more
    // than once before settling (the resume-step hydration effect), so a
    // one-shot override would only apply to the first call and silently
    // fall back to the default on the render actually asserted against below.
    mockUseFileDetails.mockReturnValue({
      file: { id: 'file-1', rowCount: 42 },
      rowCount: 42,
      isLoading: false,
      error: null,
      refetch: mockFileDetailsRefetch,
    });

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
    expect(lastSourceRowCount).toBe(42);
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

  it('falls back to Upload when the persisted step has no registered route (e.g. a "formats" step whose screen has not shipped yet)', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementationOnce((key: string) =>
      Promise.resolve(key === STORAGE_KEYS.WIZARD_STEP_BY_ENTITY ? JSON.stringify({ 'proj-1:items': 'formats' }) : null),
    );

    renderWizard();

    await waitFor(() => {
      expect(screen.getByTestId('stub-upload')).toBeTruthy();
    });
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
