import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

// ─── Theme mock ──────────────────────────────────────────────────────────────
jest.mock('@/config/theme', () => ({
  colors: { background: '#fff', accent: '#000' },
}));

// ─── Navigation mocks ────────────────────────────────────────────────────────
const mockDispatch = jest.fn();
const mockTabNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockTabNavigate }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    dispatch: mockDispatch,
    getParent: mockGetParent,
  }),
  useRoute: () => ({
    params: { projectId: 'proj-1', workstreamId: 'ws-1' },
  }),
  StackActions: { pop: jest.fn(() => ({ type: 'POP' })) },
}));

// ─── HTTP mock ───────────────────────────────────────────────────────────────
const mockHttpGet = jest.fn();
jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: { get: (...args: unknown[]) => mockHttpGet(...args) },
}));

// ─── Migration store mock ────────────────────────────────────────────────────
const mockStoreActions = {
  reset: jest.fn(),
  setReadOnly: jest.fn(),
  hydrateFileState: jest.fn().mockResolvedValue(undefined),
  setSourceERP: jest.fn(),
  setTargetERP: jest.fn(),
  completeStep: jest.fn(),
  setStep: jest.fn(),
  setWorkstreamId: jest.fn(),
};

jest.mock('@/features/migration/store/migration.store', () => ({
  useMigrationStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => mockStoreActions),
  }),
}));

// ─── ERP config store mock ──────────────────────────────────────────────────
jest.mock('@/features/erp-config/store/erp-config.store', () => ({
  useERPConfigStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({
      erpSystems: [
        { id: 'sap', name: 'SAP' },
        { id: 'oracle_netsuite', name: 'Oracle NetSuite' },
      ],
    })),
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────
import { WorkstreamDetailScreen } from '../screens/WorkstreamDetailScreen';

function makeContextResp(
  status: string,
  current_stage: string | null,
): { data: Record<string, unknown> } {
  return {
    data: {
      status,
      current_stage,
      project: { source_system: 'sap', target_system: 'oracle_netsuite' },
    },
  };
}

describe('WorkstreamDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreActions.hydrateFileState.mockResolvedValue(undefined);
  });

  it('renders an ActivityIndicator spinner while loading', () => {
    mockHttpGet.mockReturnValue(new Promise(() => undefined)); // never resolves
    render(<WorkstreamDetailScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(screen.UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
  });

  it('calls store.reset() and store.setReadOnly(false) for non-completed workstream', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', null));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockStoreActions.reset).toHaveBeenCalled();
    expect(mockStoreActions.setReadOnly).toHaveBeenCalledWith(false);
  });

  it('calls store.setReadOnly(true) for a completed workstream', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('completed', 'Preview & Export'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockStoreActions.setReadOnly).toHaveBeenCalledWith(true);
  });

  it('navigates to Upload when current_stage is null', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', null));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockTabNavigate).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'Upload',
      params: { projectId: 'proj-1' },
    });
  });

  it('navigates to Upload when current_stage is "Upload Files"', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', 'Upload Files'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockTabNavigate).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'Upload',
      params: { projectId: 'proj-1' },
    });
  });

  it('navigates to Mapping when current_stage is "Type Mapping"', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', 'Type Mapping'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockTabNavigate).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'Mapping',
      params: { projectId: 'proj-1' },
    });
  });

  it('navigates to Validation when current_stage starts with "Account Mapping:"', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', 'Account Mapping: 2'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockTabNavigate).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'Validation',
      params: { projectId: 'proj-1' },
    });
  });

  it('navigates to FinalPreview when current_stage is "Preview & Export"', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', 'Preview & Export'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockTabNavigate).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'FinalPreview',
      params: { projectId: 'proj-1' },
    });
  });

  it('navigates to Preview when status is "completed"', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('completed', 'Upload Files'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockTabNavigate).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'Preview',
      params: { projectId: 'proj-1' },
    });
  });

  it('falls back to Upload when the context fetch throws', async () => {
    mockHttpGet.mockRejectedValueOnce(new Error('network error'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockTabNavigate).toHaveBeenCalledWith('MigrationTab', {
      screen: 'Upload',
      params: { projectId: 'proj-1' },
    });
  });

  it('dispatches StackActions.pop() before navigating', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', null));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('calls hydrateFileState with the workstreamId after reset', async () => {
    mockHttpGet.mockResolvedValueOnce(makeContextResp('active', 'Type Mapping'));
    render(<WorkstreamDetailScreen />);
    await waitFor(() => expect(mockStoreActions.hydrateFileState).toHaveBeenCalled());
    expect(mockStoreActions.hydrateFileState).toHaveBeenCalledWith('ws-1');
  });
});
