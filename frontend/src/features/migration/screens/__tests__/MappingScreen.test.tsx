import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// ─── Icon mock ──────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const R = require('react');
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: `${name}-icon`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    { __esModule: true },
    {
      get: (target: Record<string, unknown>, prop: string) =>
        prop in target ? target[prop] : icon(prop),
    },
  );
});

// ─── Platform mocks ─────────────────────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    SafeAreaView: (props: Record<string, unknown>) => R.createElement(RN.View, props),
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({ isWeb: true, isNative: false }));

jest.mock('../../components/MigrationLayout', () => {
  const { View } = require('react-native');
  return {
    MigrationLayout: ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
      <View testID={testID}>{children}</View>
    ),
  };
});

// ─── Navigation mocks ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, addListener: mockAddListener }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'test-project-1' } }),
}));

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockStoreState: Record<string, unknown> = {
  currentStep: 2,
  completedSteps: [0, 1],
  typeMappingRows: [
    { id: '1', sourceType: 'Asset', targetTypes: ['Asset'], isCustom: false },
  ],
  targetTypes: ['Asset', 'Liability', 'Equity'],
  isLoading: false,
  sourceFile: { fileId: 'src-file-001', name: 'source.xlsx', rowCount: 10 },
  targetFile: { fileId: 'tgt-file-001', name: 'target.xlsx', rowCount: 10 },
  mappingFile: null,
  jobId: null,
  updateTypeMappingRow: jest.fn(),
  addTypeMappingRow: jest.fn(),
  deleteTypeMappingRow: jest.fn(),
  setStep: jest.fn(),
  completeStep: jest.fn(),
  setJobId: jest.fn(),
};

jest.mock('../../store/migration.store', () => {
  const hook = (selector: (state: typeof mockStoreState) => unknown) =>
    typeof selector === 'function' ? selector(mockStoreState) : mockStoreState;
  hook.getState = () => mockStoreState;
  return { useMigrationStore: hook };
});

let mockAllMatched = true;
jest.mock('../../store/migration.selectors', () => ({
  selectTypeMappingSummary: () => ({
    total: 1,
    matched: mockAllMatched ? 1 : 0,
    allMatched: mockAllMatched,
  }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn,
}));

// ─── Service + HTTP mocks ──────────────────────────────────────────────────
const mockGetHierarchicalMapping = jest.fn().mockResolvedValue({
  ok: true,
  data: { job_id: 'job-001', project_id: 'test-project-1', status: 'pending' },
});
jest.mock('../../services/mapping.service', () => ({
  getHierarchicalMapping: (...args: unknown[]) => mockGetHierarchicalMapping(...args),
  buildCustomTypeMappings: jest.fn(() => ({})),
  applyCustomTypeMappings: jest.fn((m: unknown) => m),
  normalizeGroupedMappings: jest.fn((m: unknown) => m),
  saveMappings: jest.fn(),
  toMappingCreateDTOs: jest.fn(() => []),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

// ─── Hook mocks ─────────────────────────────────────────────────────────────
const mockRunMapping = jest.fn();
jest.mock('../../hooks/useFuzzyMapper', () => ({
  useFuzzyMapper: () => ({ runMapping: mockRunMapping, isMapping: false }),
}));

jest.mock('../../hooks/useHydrateProject', () => ({
  useHydrateProject: () => ({ isHydrating: false, error: null, retry: jest.fn() }),
}));

const mockSaveMappings = jest.fn().mockResolvedValue(undefined);
const mockClearMappings = jest.fn().mockResolvedValue(undefined);
const mockAccountTypeMappings: {
  rows: Array<{ id: string; sourceType: string; targetTypes: readonly string[] }>;
  availableTargetTypes: readonly string[];
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  save: jest.Mock;
  clear: jest.Mock;
} = {
  rows: [],
  availableTargetTypes: [],
  isLoading: false,
  isSaving: false,
  isDirty: false,
  save: mockSaveMappings,
  clear: mockClearMappings,
};
jest.mock('../../hooks/useAccountTypeMappings', () => ({
  useAccountTypeMappings: () => mockAccountTypeMappings,
}));

jest.mock('@/shared/hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirm: jest.fn().mockResolvedValue(true),
    isVisible: false,
    confirmOptions: null,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }),
}));

// ─── Child component stubs ──────────────────────────────────────────────────
jest.mock('../../components/MigrationStepper/MigrationStepper', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    MigrationStepper: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: 'migration-stepper', ...props }),
  };
});

jest.mock('../../components/MappingTableSkeleton', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    MappingTableSkeleton: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'mapping-table-skeleton' }),
  };
});

// ─── Config mock ────────────────────────────────────────────────────────────
jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', primaryForeground: '#FAFAFA', success: '#16A34A', warning: '#D97706' },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────
import { MappingScreen } from '../MappingScreen';

describe('MappingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.isLoading = false;
    mockStoreState.typeMappingRows = [
      { id: '1', sourceType: 'Asset', targetTypes: ['Asset'], isCustom: false },
    ];
    mockAllMatched = true;
    mockAccountTypeMappings.rows = [];
    mockAccountTypeMappings.isDirty = false;
    mockAccountTypeMappings.isSaving = false;
  });

  it('renders with testID "mapping-screen"', () => {
    render(<MappingScreen />);
    expect(screen.getByTestId('mapping-screen')).toBeTruthy();
  });

  it('shows "Review Account Type Mapping" heading', () => {
    render(<MappingScreen />);
    expect(screen.getByText('Review Account Type Mapping')).toBeTruthy();
  });

  it('renders account type mapping card', () => {
    render(<MappingScreen />);
    expect(screen.getByTestId('account-type-mapping-card')).toBeTruthy();
  });

  it('renders Proceed button disabled when not all types matched', () => {
    mockAllMatched = false;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-proceed-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders Proceed button enabled when all types matched', () => {
    mockAllMatched = true;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-proceed-button');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('shows mapping preview card', () => {
    render(<MappingScreen />);
    expect(screen.getByTestId('mapping-preview-card')).toBeTruthy();
  });

  it('shows skeleton when loading and no rows', () => {
    mockStoreState.isLoading = true;
    mockStoreState.typeMappingRows = [];
    render(<MappingScreen />);
    expect(screen.getByTestId('mapping-skeleton')).toBeTruthy();
  });

  it('calls getHierarchicalMapping when Proceed button is pressed', async () => {
    mockStoreState.jobId = null;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-proceed-button');
    await fireEvent.press(button);
    expect(mockGetHierarchicalMapping).toHaveBeenCalledWith(
      expect.anything(),
      'test-project-1',
      'src-file-001',
      'tgt-file-001',
      undefined,
    );
  });

  it('disables Save Mappings button when rows are empty', () => {
    mockAccountTypeMappings.rows = [];
    mockAccountTypeMappings.isDirty = false;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-save-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables Save Mappings button when rows exist even if not dirty', () => {
    mockAccountTypeMappings.rows = [
      { id: 'r1', sourceType: 'Asset', targetTypes: ['Asset'] },
    ];
    mockAccountTypeMappings.isDirty = false;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-save-button');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('disables Save Mappings button while saving is in progress', () => {
    mockAccountTypeMappings.rows = [
      { id: 'r1', sourceType: 'Asset', targetTypes: ['Asset'] },
    ];
    mockAccountTypeMappings.isDirty = true;
    mockAccountTypeMappings.isSaving = true;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-save-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('calls accountTypeMappings.save when Save is pressed with isDirty=false but rows exist', async () => {
    mockAccountTypeMappings.rows = [
      { id: 'r1', sourceType: 'Asset', targetTypes: ['Asset'] },
    ];
    mockAccountTypeMappings.isDirty = false;
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-save-button');
    await fireEvent.press(button);
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
  });
});
