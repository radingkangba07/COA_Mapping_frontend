import React from 'react';
import { render, screen, act } from '@testing-library/react-native';

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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'test-project-1' } }),
}));

// ─── Toast mock ────────────────────────────────────────────────────────────
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockShowWarning = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: mockShowWarning,
  }),
}));

// ─── Hook mocks ────────────────────────────────────────────────────────────
interface JobStreamOptions {
  onComplete?: (event: Record<string, unknown>) => void;
  onFailed?: (event: Record<string, unknown>) => void;
}

const mockJobStreamOptionsRef: { current: JobStreamOptions | null } = { current: null };
const mockJobStream = {
  status: 'open',
  lastEvent: null,
  error: null as { code: string; message: string } | null,
  reconnect: jest.fn(),
};

jest.mock('../../hooks/useJobStream', () => ({
  useJobStream: jest.fn((_projectId: string, options?: JobStreamOptions) => {
    mockJobStreamOptionsRef.current = options ?? null;
    return mockJobStream;
  }),
}));

const mockRefetch = jest.fn().mockResolvedValue({ data: [] });
const mockSuggestions = {
  suggestions: [] as unknown[],
  isLoading: false,
  error: null as unknown,
  refetch: mockRefetch,
};

jest.mock('../../hooks/useMappingSuggestions', () => ({
  useMappingSuggestions: jest.fn(() => mockSuggestions),
}));

// ─── Store mock ────────────────────────────────────────────────────────────
const mockSetGroupedMappings = jest.fn();

jest.mock('../../store/migration.store', () => {
  const getStoreState = (): Record<string, unknown> => ({
    sourceERP: { id: 'sap', name: 'SAP' },
    targetERP: { id: 'netsuite', name: 'NetSuite' },
    currentStep: 3,
    setGroupedMappings: mockSetGroupedMappings,
  });
  const useMigrationStore = Object.assign(
    jest.fn((selector?: (s: Record<string, unknown>) => unknown) => {
      const state = getStoreState();
      return selector ? selector(state) : state;
    }),
    { getState: getStoreState },
  );
  return { useMigrationStore };
});

// ─── Adapter mock ──────────────────────────────────────────────────────────
jest.mock('../../services/suggestion-adapter.service', () => ({
  adaptSuggestionsToGroupedMappings: jest.fn((groups: readonly unknown[]) => groups),
}));

// ─── ViewModel mock ─────────────────────────────────────────────────────────
const mockVM = {
  currentStep: 3,
  completedSteps: [0, 1, 2],
  sourceFile: { name: 'test.xlsx', rowCount: 10 } as { name: string; rowCount: number } | null,
  sourceERP: { id: 'sap', name: 'SAP' },
  targetERP: { id: 'netsuite', name: 'NetSuite' },
  confidenceFilter: null as string | null,
  confirmedHigh: false,
  confirmedMedium: false,
  confirmedLow: false,
  deletedAccounts: [] as Array<{
    sourceNumber: string;
    sourceName: string;
    sourceType: string;
  }>,
  targetTypes: ['Asset', 'Liability'],
  targetAccountNames: [],
  stats: {
    totalTypes: 2,
    totalAccounts: 5,
    highConfidence: 3,
    mediumConfidence: 1,
    lowConfidence: 1,
    confirmedCount: 0,
  },
  filteredMappings: [
    {
      source_type: 'Asset',
      target_type: 'Asset',
      confidence: 95,
      accounts: [
        {
          source_number: '1000',
          source_name: 'Cash',
          target_name: 'Cash and equivalents',
          score: 95,
          remark: '',
          user_changed: false,
        },
      ],
    },
  ],
  allConfirmed: false,
  errors: [] as string[],
  warnings: [] as string[],
  isDeletedOpen: false,
  hasUnsavedChanges: false,
  isSaving: false,
  handleStepPress: jest.fn(),
  handleFilterPress: jest.fn(),
  handleConfirm: jest.fn(),
  handleTypeChange: jest.fn(),
  handleAccountNameChange: jest.fn(),
  handleDeleteAccount: jest.fn(),
  handleRestoreAccount: jest.fn(),
  handleToggleDeleted: jest.fn(),
  handleBack: jest.fn(),
  handleContinue: jest.fn(),
  handleSaveMappings: jest.fn(),
};

jest.mock('../../hooks/useValidationScreenViewModel', () => ({
  useValidationScreenViewModel: jest.fn(() => mockVM),
}));

jest.mock('../../hooks/useHydrateProject', () => ({
  useHydrateProject: () => ({ isHydrating: false, error: null, retry: jest.fn() }),
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

jest.mock('../../components/MappingStatsBar/MappingStatsBar', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    MappingStatsBar: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'mapping-stats-bar' }),
  };
});

jest.mock('../../components/AccountTypeGroup/AccountTypeGroup', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    AccountTypeGroup: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'account-type-group' }),
  };
});

jest.mock('../../components/ValidationSkeleton', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    ValidationSkeleton: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'validation-skeleton' }),
  };
});

jest.mock('@/shared/components/ui/Checkbox', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Checkbox: (props: Record<string, unknown>) =>
      R.createElement(
        RN.View,
        { testID: props.testID ?? 'checkbox' },
        props.label ? R.createElement(RN.Text, null, props.label) : null,
      ),
  };
});

jest.mock('@/shared/components/ui/Collapsible', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Collapsible: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'collapsible' }, props.children),
  };
});

jest.mock('@/shared/components/ui/Skeleton', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Skeleton: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'skeleton' }),
  };
});

// ─── Config mock ────────────────────────────────────────────────────────────
jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', primaryForeground: '#FAFAFA' },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────
import { ValidationScreen } from '../ValidationScreen';

function baseEvent(
  status: 'completed' | 'failed',
  jobType = 'account_matching',
): Record<string, unknown> {
  return {
    jobId: 'job-1',
    projectId: 'test-project-1',
    companyId: null,
    jobType,
    status,
    sourceFileId: null,
    targetFileId: null,
    mappingFileId: null,
    accountTypeMappingFileId: null,
    triggeredBy: null,
    createdAt: null,
    startedAt: null,
    completedAt: null,
    eventAt: null,
    errorMessage: null,
    metadata: { sourceSystem: null, targetSystem: null },
  };
}

describe('ValidationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVM.allConfirmed = false;
    mockVM.confidenceFilter = null;
    mockVM.errors = [];
    mockVM.warnings = [];
    mockVM.stats.totalAccounts = 5;
    mockVM.filteredMappings = [
      {
        source_type: 'Asset',
        target_type: 'Asset',
        confidence: 95,
        accounts: [
          {
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash and equivalents',
            score: 95,
            remark: '',
            user_changed: false,
          },
        ],
      },
    ];
    mockSuggestions.suggestions = [];
    mockSuggestions.isLoading = false;
    mockJobStream.error = null;
    mockJobStreamOptionsRef.current = null;
  });

  it('renders with testID "validation-screen"', () => {
    render(<ValidationScreen />);
    expect(screen.getByTestId('validation-screen')).toBeTruthy();
  });

  it('shows "COA Mapping" heading', () => {
    render(<ValidationScreen />);
    expect(screen.getByText('COA Mapping')).toBeTruthy();
  });

  it('renders MappingStatsBar', () => {
    render(<ValidationScreen />);
    expect(screen.getByTestId('mapping-stats-bar')).toBeTruthy();
  });

  it('shows confirmation checkbox when confidence filter is active', () => {
    mockVM.confidenceFilter = 'high';
    render(<ValidationScreen />);
    expect(screen.getByTestId('confirm-high')).toBeTruthy();
  });

  it('renders account type groups', () => {
    render(<ValidationScreen />);
    expect(screen.getByTestId('group-Asset')).toBeTruthy();
  });

  it('renders Continue button disabled when not all confirmed', () => {
    mockVM.allConfirmed = false;
    render(<ValidationScreen />);
    const button = screen.getByTestId('continue-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders Continue button enabled when all confirmed', () => {
    mockVM.allConfirmed = true;
    render(<ValidationScreen />);
    const button = screen.getByTestId('continue-button');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('does not render validation issues banner (removed)', () => {
    mockVM.errors = ['Missing account number'];
    mockVM.warnings = ['Low confidence match'];
    render(<ValidationScreen />);
    expect(screen.queryByTestId('validation-issues-card')).toBeNull();
  });

  it('shows skeleton when no data is loaded', () => {
    mockVM.stats.totalAccounts = 0;
    mockVM.filteredMappings = [];
    render(<ValidationScreen />);
    expect(screen.getByTestId('validation-skeleton')).toBeTruthy();
  });

  describe('live updates', () => {
    it('pushes adapted suggestions into the store when they arrive', () => {
      mockSuggestions.suggestions = [
        {
          sourceType: 'Asset',
          targetType: 'Asset',
          confidence: 1,
          accounts: [],
        },
      ];
      render(<ValidationScreen />);
      expect(mockSetGroupedMappings).toHaveBeenCalledTimes(1);
      expect(mockSetGroupedMappings).toHaveBeenCalledWith(mockSuggestions.suggestions);
    });

    it('does not push to the store while suggestions are loading', () => {
      mockSuggestions.suggestions = [];
      mockSuggestions.isLoading = true;
      render(<ValidationScreen />);
      expect(mockSetGroupedMappings).not.toHaveBeenCalled();
    });

    it('refetches suggestions and toasts success on matching job complete', async () => {
      render(<ValidationScreen />);
      const opts = mockJobStreamOptionsRef.current;
      expect(opts?.onComplete).toBeDefined();
      await act(async () => {
        opts?.onComplete?.(baseEvent('completed', 'account_matching'));
      });
      expect(mockRefetch).toHaveBeenCalledTimes(1);
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Mapping complete',
        'Latest suggestions loaded.',
      );
    });

    it('ignores unrelated job types on complete', async () => {
      render(<ValidationScreen />);
      const opts = mockJobStreamOptionsRef.current;
      await act(async () => {
        opts?.onComplete?.(baseEvent('completed', 'export'));
      });
      expect(mockRefetch).not.toHaveBeenCalled();
      expect(mockShowSuccess).not.toHaveBeenCalled();
    });

    it('surfaces a friendly error toast on matching job failure', () => {
      render(<ValidationScreen />);
      const opts = mockJobStreamOptionsRef.current;
      const event = baseEvent('failed', 'mapping');
      (event as { errorMessage: string | null }).errorMessage = 'Out of memory';
      opts?.onFailed?.(event);
      expect(mockShowError).toHaveBeenCalledWith('Mapping failed', 'Out of memory');
    });

    it('falls back to a default error message when errorMessage is null', () => {
      render(<ValidationScreen />);
      const opts = mockJobStreamOptionsRef.current;
      opts?.onFailed?.(baseEvent('failed', 'account_matching'));
      expect(mockShowError).toHaveBeenCalledWith('Mapping failed', 'Please try again.');
    });

    it('ignores unrelated job types on failure', () => {
      render(<ValidationScreen />);
      const opts = mockJobStreamOptionsRef.current;
      opts?.onFailed?.(baseEvent('failed', 'export'));
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('shows "Live updates unavailable" warning once when jobStream.error is non-null', () => {
      mockJobStream.error = { code: 'WS_ERROR', message: 'socket closed' };
      const { rerender } = render(<ValidationScreen />);
      expect(mockShowWarning).toHaveBeenCalledWith(
        'Live updates unavailable',
        'Refresh to check status.',
      );
      // Re-render with the same non-null error — should not toast again
      rerender(<ValidationScreen />);
      expect(mockShowWarning).toHaveBeenCalledTimes(1);
    });

    it('does not toast when jobStream.error is null', () => {
      mockJobStream.error = null;
      render(<ValidationScreen />);
      expect(mockShowWarning).not.toHaveBeenCalled();
    });
  });
});
