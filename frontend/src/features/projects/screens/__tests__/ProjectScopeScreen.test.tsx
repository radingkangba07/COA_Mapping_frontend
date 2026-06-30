import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ERPSystem } from '@/features/erp-config/types/erp-config.types';
import type { ProjectScopeViewModel } from '../../hooks/useProjectScopeViewModel';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// The project's global reanimated mock resolves to {} on this version, so the
// real Collapsible (rendered via MigrationScopeSection) crashes on
// useSharedValue/withTiming. Provide a minimal animated-API stub so it mounts.
jest.mock('react-native-reanimated', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const AnimatedView = ReactModule.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      ReactModule.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (toValue: unknown) => toValue,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) => (
      <View {...props}>{children as React.ReactNode}</View>
    ),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
    accent: '#2563EB',
    success: '#16A34A',
    destructive: '#DC2626',
  },
}));

// The per-side connection config imports TestConnectionFlow, which loads the
// real http instance at module level; stub it so module load stays inert.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

const mockNavigate = jest.fn();
const mockRoute = jest.fn<{ params: unknown }, []>(() => ({
  params: { companyId: 'c1', name: 'My Migration', description: 'd' },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockRoute(),
}));

// ─── ViewModel Mock ─────────────────────────────────────────────────────────

const mockCreate = jest.fn<Promise<boolean>, []>();
const mockSaveDraft = jest.fn<Promise<void>, []>();
const mockSetSource = jest.fn();
const mockSetTarget = jest.fn();
const mockSetSourceMethod = jest.fn();
const mockSetTargetMethod = jest.fn();
const mockUpdateConnection = jest.fn();
const mockSetConnectionReady = jest.fn();
const mockSetName = jest.fn();
const mockSetDescription = jest.fn();
const mockSetCompanyId = jest.fn();

const initialConnection = {
  scope: 'source' as const,
  url: '',
  token: '',
  authType: 'none' as const,
  headers: [],
  skipSSL: false,
  proxy: '',
  timeout: 30000,
};

const erpSystems: ERPSystem[] = [
  { id: 'sap', name: 'SAP', description: '', fields: [] },
  { id: 'xero', name: 'Xero', description: '', fields: [] },
];

const baseVM: ProjectScopeViewModel = {
  draft: {
    companyId: 'c1',
    name: 'My Migration',
    description: 'd',
    source: null,
    target: null,
    method: 'mcp',
    sourceMethod: 'csv',
    targetMethod: 'csv',
    connection: { ...initialConnection, scope: 'source' },
    scope: { selectedMasterData: [], selectedOpeningBalances: [], aggregation: 'none' },
    members: [],
  },
  name: 'My Migration',
  description: 'd',
  companyId: 'c1',
  companyOptions: [],
  parentOrgId: null,
  memberCount: 0,
  source: null,
  target: null,
  sourceMethod: 'csv',
  targetMethod: 'csv',
  connection: { ...initialConnection, scope: 'source' },
  connectionReady: false,
  isSavingDraft: false,
  isCreating: false,
  erpSystems,
  isLoadingErps: false,
  sourceName: null,
  targetName: null,
  isCompatible: false,
  createDisabled: true,
  setName: mockSetName,
  setDescription: mockSetDescription,
  setCompanyId: mockSetCompanyId,
  setSource: mockSetSource,
  setTarget: mockSetTarget,
  setSourceMethod: mockSetSourceMethod,
  setTargetMethod: mockSetTargetMethod,
  updateConnection: mockUpdateConnection,
  setConnectionReady: mockSetConnectionReady,
  saveDraft: mockSaveDraft,
  create: mockCreate,
};

const mockUseProjectScopeViewModel = jest.fn<ProjectScopeViewModel, [unknown]>(
  () => baseVM,
);

jest.mock('../../hooks/useProjectScopeViewModel', () => ({
  useProjectScopeViewModel: (seed: unknown) => mockUseProjectScopeViewModel(seed),
}));

// Summary bar VM is exercised by its own unit tests (DA-158); stub it here so the
// screen render does not pull in useERPConfig/useQuery (needs no QueryClient).
jest.mock('../../hooks/useProjectSummaryViewModel', () => ({
  useProjectSummaryViewModel: () => ({
    summary: {
      source: null,
      target: null,
      sourceMethod: 'CSV File Upload',
      targetMethod: 'CSV File Upload',
      masterData: '0 of 9 selected',
      openingBalances: '0 of 5 selected',
      members: '0',
    },
  }),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { ProjectScopeScreen } from '../ProjectScopeScreen';

// ─── Helpers ────────────────────────────────────────────────────────────────

function setVM(overrides: Partial<ProjectScopeViewModel>): void {
  mockUseProjectScopeViewModel.mockReturnValue({ ...baseVM, ...overrides });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectScopeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectScopeViewModel.mockReturnValue({ ...baseVM });
    mockRoute.mockReturnValue({
      params: { companyId: 'c1', name: 'My Migration', description: 'd' },
    });
    mockCreate.mockResolvedValue(true);
    mockSaveDraft.mockResolvedValue(undefined);
  });

  // ── Rendering / structure ─────────────────────────────────────────────

  it('renders the screen frame and section headings', () => {
    render(<ProjectScopeScreen />);
    expect(screen.getByTestId('project-scope-screen')).toBeTruthy();
    expect(screen.getByTestId('project-scope-header')).toBeTruthy();
    expect(screen.getByTestId('project-summary-bar')).toBeTruthy();
    expect(screen.getByTestId('section-select-erp')).toBeTruthy();
  });

  it('renders the on-page entry section with an editable name input', () => {
    render(<ProjectScopeScreen />);
    expect(screen.getByTestId('project-scope-entry')).toBeTruthy();
    expect(screen.getByTestId('project-scope-name-input')).toBeTruthy();
    expect(screen.getByDisplayValue('My Migration')).toBeTruthy();
    expect(screen.getByTestId('project-scope-company')).toBeTruthy();
  });

  it('writes name edits live to the ViewModel', () => {
    render(<ProjectScopeScreen />);
    fireEvent.changeText(
      screen.getByDisplayValue('My Migration'),
      'Renamed Migration',
    );
    expect(mockSetName).toHaveBeenCalledWith('Renamed Migration');
  });

  it('seeds the ViewModel from route params', () => {
    render(<ProjectScopeScreen />);
    expect(mockUseProjectScopeViewModel).toHaveBeenCalledWith({
      companyId: 'c1',
      name: 'My Migration',
      description: 'd',
    });
  });

  it('renders when reached with no route params', () => {
    mockRoute.mockReturnValue({ params: undefined });
    render(<ProjectScopeScreen />);
    expect(screen.getByTestId('project-scope-screen')).toBeTruthy();
    expect(mockUseProjectScopeViewModel).toHaveBeenCalledWith({
      companyId: null,
      name: undefined,
      description: undefined,
    });
  });

  // ── Gating: createDisabled ────────────────────────────────────────────

  it('disables the Create button and does not call create when createDisabled', () => {
    setVM({ createDisabled: true });
    render(<ProjectScopeScreen />);

    const createBtn = screen.getByTestId('project-scope-create');
    expect(createBtn.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(createBtn);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('enables Create and navigates to ProjectsList on resolved create', async () => {
    setVM({ createDisabled: false });
    mockCreate.mockResolvedValue(true);
    render(<ProjectScopeScreen />);

    const createBtn = screen.getByTestId('project-scope-create');
    expect(createBtn.props.accessibilityState?.disabled).toBe(false);

    fireEvent.press(createBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ProjectsList');
    });
  });

  it('does NOT navigate when create resolves false', async () => {
    setVM({ createDisabled: false });
    mockCreate.mockResolvedValue(false);
    render(<ProjectScopeScreen />);

    fireEvent.press(screen.getByTestId('project-scope-create'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── Save as Draft ─────────────────────────────────────────────────────

  it('invokes saveDraft when Save as Draft is pressed', () => {
    render(<ProjectScopeScreen />);
    fireEvent.press(screen.getByTestId('project-scope-save-draft'));
    expect(mockSaveDraft).toHaveBeenCalledTimes(1);
  });
});
