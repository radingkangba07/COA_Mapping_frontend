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
    success: '#16A34A',
    destructive: '#DC2626',
  },
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({
    params: { companyId: 'c1', name: 'My Migration', description: 'd' },
  }),
}));

// ─── ViewModel Mock ─────────────────────────────────────────────────────────

const mockCreate = jest.fn<Promise<boolean>, []>();
const mockSaveDraft = jest.fn<Promise<void>, []>();
const mockSetSource = jest.fn();
const mockSetTarget = jest.fn();
const mockSetMethod = jest.fn();

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
    connection: {
      scope: 'source',
      url: '',
      token: '',
      authType: 'none',
      headers: [],
      skipSSL: false,
      proxy: '',
      timeout: 30000,
    },
    scope: { selectedMasterData: [], selectedOpeningBalances: [], aggregation: 'none' },
    members: [],
  },
  name: 'My Migration',
  description: 'd',
  companyId: 'c1',
  source: null,
  target: null,
  method: 'mcp',
  connectionReady: false,
  isSavingDraft: false,
  isCreating: false,
  erpSystems,
  isLoadingErps: false,
  sourceName: null,
  targetName: null,
  isCompatible: false,
  createDisabled: true,
  setSource: mockSetSource,
  setTarget: mockSetTarget,
  setMethod: mockSetMethod,
  saveDraft: mockSaveDraft,
  create: mockCreate,
};

const mockUseProjectScopeViewModel = jest.fn<ProjectScopeViewModel, [unknown]>(
  () => baseVM,
);

jest.mock('../../hooks/useProjectScopeViewModel', () => ({
  useProjectScopeViewModel: (seed: unknown) => mockUseProjectScopeViewModel(seed),
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
    mockCreate.mockResolvedValue(true);
    mockSaveDraft.mockResolvedValue(undefined);
  });

  // ── Rendering / structure ─────────────────────────────────────────────

  it('renders the screen frame and section headings', () => {
    render(<ProjectScopeScreen />);
    expect(screen.getByTestId('project-scope-screen')).toBeTruthy();
    expect(screen.getByTestId('project-scope-header')).toBeTruthy();
    expect(screen.getByTestId('section-project-summary')).toBeTruthy();
    expect(screen.getByTestId('section-select-erp')).toBeTruthy();
  });

  it('shows the project name as read-only text', () => {
    render(<ProjectScopeScreen />);
    expect(screen.getByText('My Migration')).toBeTruthy();
  });

  it('does NOT render an editable name field or company picker', () => {
    render(<ProjectScopeScreen />);
    expect(screen.queryByTestId('new-project-name-input')).toBeNull();
    expect(screen.queryByTestId('new-project-company-dropdown')).toBeNull();
    expect(screen.queryByText('Project Details')).toBeNull();
  });

  it('seeds the ViewModel from route params', () => {
    render(<ProjectScopeScreen />);
    expect(mockUseProjectScopeViewModel).toHaveBeenCalledWith({
      companyId: 'c1',
      name: 'My Migration',
      description: 'd',
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
