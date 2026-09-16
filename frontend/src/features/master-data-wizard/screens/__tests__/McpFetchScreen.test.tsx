import { render, screen, fireEvent } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────
// All jest.mock factories are hoisted — use require() instead of React/imports.

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

const mockUseMcpFetch = jest.fn();
jest.mock('../../hooks/useMcpFetch', () => ({
  useMcpFetch: (...a: unknown[]) => mockUseMcpFetch(...a),
}));

const mockUseEntityPack = jest.fn();
jest.mock('../../hooks/useEntityPack', () => ({
  useEntityPack: (...a: unknown[]) => mockUseEntityPack(...a),
}));

const mockUseProjectDetail = jest.fn();
jest.mock('@/features/projects/hooks/useProjectDetail', () => ({
  useProjectDetail: (...a: unknown[]) => mockUseProjectDetail(...a),
}));

const mockScopeStore: Record<string, unknown> = {
  sourceConnectionId: 'conn-99',
  sourceCredentials: { api_key: 'k' },
  mcpFetchData: {},
  setMcpFetchData: jest.fn(),
};
jest.mock('@/features/projects/store/project-scope.store', () => ({
  useProjectScopeStore: (sel: (s: typeof mockScopeStore) => unknown) => sel(mockScopeStore),
}));

const mockWizardStore: Record<string, unknown> = {
  recordStep: jest.fn(),
  setPipelineRunId: jest.fn(),
  setWizardContext: jest.fn(),
  pipelineRunIdByEntity: {},
};
jest.mock('../../store/wizard.store', () => ({
  useWizardStore: (sel: (s: typeof mockWizardStore) => unknown) => sel(mockWizardStore),
}));

jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn() }),
}));

jest.mock('../../services/entity-pack.service', () => ({
  createPipelineRun: jest.fn(),
  getActivePipelineRun: jest.fn(),
  isPipelineRunConflict: jest.fn(),
}));

jest.mock('@/shared/constants/erp-systems', () => ({
  getERPById: () => ({ name: 'Oracle NetSuite', brandColor: '#0077B6' }),
}));

jest.mock('@/features/migration/components/MigrationLayout', () => ({
  MigrationLayout: ({ children, testID }: { children: unknown; testID?: string }) =>
    require('react').createElement(require('react-native').View, { testID }, children),
}));

jest.mock('@/shared/components/feedback/NetworkErrorFallback', () => ({
  NetworkErrorFallback: ({ testID }: { testID?: string }) =>
    require('react').createElement(require('react-native').View, { testID }),
}));

jest.mock('@/shared/components/ui/Spinner', () => ({
  Spinner: () =>
    require('react').createElement(require('react-native').View, { testID: 'spinner' }),
}));

jest.mock('@/shared/components/ui/StepRail', () => ({
  StepRail: () =>
    require('react').createElement(require('react-native').View, { testID: 'step-rail' }),
}));

jest.mock('../../mappers/toStepRail', () => ({ toStepRail: () => [] }));

jest.mock('../../dp-kit/react/taxonomy', () => ({
  STEPS: [
    { id: 'upload', n: 1, label: 'Upload / Connect' },
    { id: 'profile', n: 2, label: 'Profile' },
    { id: 'map', n: 3, label: 'Map' },
    { id: 'validate', n: 4, label: 'Validate' },
    { id: 'approve', n: 5, label: 'Approve' },
    { id: 'export', n: 6, label: 'Export' },
    { id: 'import', n: 7, label: 'Import' },
    { id: 'reconcile', n: 8, label: 'Reconcile' },
  ],
}));

jest.mock('@/shared/components/ui/FileUploader', () => ({
  FileTargetCard: () =>
    require('react').createElement(require('react-native').View, { testID: 'file-target-card' }),
}));

jest.mock('@/shared/components/ui/Button', () => ({
  Button: ({ onPress, disabled, testID, children }: {
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
    children?: unknown;
  }) => require('react').createElement(
    require('react-native').Pressable,
    { onPress, testID, accessibilityState: { disabled: !!disabled } },
    children,
  ),
}));

jest.mock('lucide-react-native', () => ({
  LayoutTemplate: () => null,
  File: () => null,
  ArrowLeft: () => null,
  ArrowRight: () => null,
  Server: () => null,
}));

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#000',
    primaryForeground: '#fff',
    mutedForeground: '#888',
    primary: '#0A84FF',
    accent: '#007AFF',
    border: '#ccc',
  },
  semanticClass: (_family: string, _state: string) => ({ bg: 'bg-gray-100', fg: 'text-gray-900' }),
}));

jest.mock('@/shared/types/common.types', () => ({
  createProjectId: (id: string) => id,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { useRoute } from '@react-navigation/native';
import { McpFetchScreen } from '../McpFetchScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_ROUTE_PARAMS = {
  orgProjectId: 'org-proj-1',
  entityId: 'items',
  parentProjectId: 'parent-proj-1',
  workstreamId: 'ws-1',
};

const DEFAULT_PROJECT = {
  projectId: 'parent-proj-1',
  name: 'Test Project',
  status: 'active',
  sourceErp: 'netsuite',
  targetErp: 'odoo',
  displayCode: 'TP-01',
  createdAt: '2025-01-01',
  sourceConnectionMethodId: 'conn-99',
};

const DEFAULT_PACK = {
  label: { singular: 'Item', plural: 'Items' },
  spec: {},
  target: { record: 'product.template' },
};

function defaultMcpFetch(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    records: [],
    fields: [],
    total: 0,
    isFetching: false,
    error: null,
    snapshotStoragePath: null,
    hasFetchedInSession: false,
    fetch: jest.fn(),
    ...overrides,
  };
}

function setup(
  mcpOverrides: Partial<Record<string, unknown>> = {},
  projectOverrides: Partial<Record<string, unknown>> = {},
) {
  (useRoute as jest.Mock).mockReturnValue({ params: DEFAULT_ROUTE_PARAMS });
  mockUseMcpFetch.mockReturnValue(defaultMcpFetch(mcpOverrides));
  mockUseEntityPack.mockReturnValue({ pack: DEFAULT_PACK, refetch: jest.fn() });
  mockUseProjectDetail.mockReturnValue({
    project: { ...DEFAULT_PROJECT, ...projectOverrides },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('McpFetchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScopeStore.sourceConnectionId = 'conn-99';
    mockScopeStore.sourceCredentials = { api_key: 'k' };
  });

  it('renders the main screen with testID when project is loaded', () => {
    setup();
    render(<McpFetchScreen />);
    expect(screen.getByTestId('mcp-fetch-screen')).toBeTruthy();
  });

  it('shows a spinner when project is still loading', () => {
    (useRoute as jest.Mock).mockReturnValue({ params: DEFAULT_ROUTE_PARAMS });
    mockUseMcpFetch.mockReturnValue(defaultMcpFetch());
    mockUseEntityPack.mockReturnValue({ pack: null, refetch: jest.fn() });
    mockUseProjectDetail.mockReturnValue({
      project: null,
      isLoading: true,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<McpFetchScreen />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('shows NetworkErrorFallback when project fails to load', () => {
    (useRoute as jest.Mock).mockReturnValue({ params: DEFAULT_ROUTE_PARAMS });
    mockUseMcpFetch.mockReturnValue(defaultMcpFetch());
    mockUseEntityPack.mockReturnValue({ pack: DEFAULT_PACK, refetch: jest.fn() });
    mockUseProjectDetail.mockReturnValue({
      project: null,
      isLoading: false,
      isFetching: false,
      error: { message: 'Network error' },
      refetch: jest.fn(),
    });

    render(<McpFetchScreen />);
    expect(screen.getByTestId('mcp-fetch-error')).toBeTruthy();
  });

  it('shows "No MCP connection" message when sourceConnectionId is null', () => {
    mockScopeStore.sourceConnectionId = null;
    setup();
    render(<McpFetchScreen />);
    expect(screen.getByText(/No MCP connection tested/)).toBeTruthy();
  });

  it('shows the fetch button when a connection exists', () => {
    setup();
    render(<McpFetchScreen />);
    expect(screen.getByTestId('mcp-fetch-button')).toBeTruthy();
  });

  it('Continue button is disabled when there are no records', () => {
    setup({ records: [], total: 0 });
    render(<McpFetchScreen />);
    const continueBtn = screen.getByTestId('mcp-fetch-continue-button');
    expect(continueBtn.props.accessibilityState.disabled).toBe(true);
  });

  it('Continue button is enabled when records exist', () => {
    setup({ records: [{ name: 'Widget' }], fields: ['name'], total: 1 });
    render(<McpFetchScreen />);
    const continueBtn = screen.getByTestId('mcp-fetch-continue-button');
    expect(continueBtn.props.accessibilityState.disabled).toBe(false);
  });

  it('displays record count in the header when records are present', () => {
    setup({ records: [{ name: 'A' }], fields: ['name'], total: 42 });
    render(<McpFetchScreen />);
    // Multiple elements may contain "42 records" — assert at least one exists
    expect(screen.getAllByText(/42 records/).length).toBeGreaterThan(0);
  });

  it('calls fetch() when the fetch button is pressed', () => {
    const mockFetch = jest.fn().mockResolvedValue(undefined);
    setup({ fetch: mockFetch });
    render(<McpFetchScreen />);
    fireEvent.press(screen.getByTestId('mcp-fetch-button'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('calls navigation.goBack() when Back button is pressed', () => {
    setup();
    render(<McpFetchScreen />);
    fireEvent.press(screen.getByTestId('mcp-fetch-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows fetch error message when mcpFetch.error is set', () => {
    setup({ error: 'adapter_timeout' });
    render(<McpFetchScreen />);
    expect(screen.getByText(/Error: adapter_timeout/)).toBeTruthy();
  });

  it('shows "Fetching…" label on the fetch button while isFetching is true', () => {
    setup({ isFetching: true });
    render(<McpFetchScreen />);
    expect(screen.getByText('Fetching…')).toBeTruthy();
  });
});
