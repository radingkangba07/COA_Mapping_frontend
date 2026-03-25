import React from 'react';
import { render, screen } from '@testing-library/react-native';

// ─── Icon mock ──────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const R = require('react');
  const icon = (name: string) => (props: Record<string, unknown>) =>
    R.createElement(RN.View, { testID: `${name}-icon`, ...props });
  return {
    ArrowLeft: icon('ArrowLeft'),
    ArrowRight: icon('ArrowRight'),
    RotateCcw: icon('RotateCcw'),
    __esModule: true,
  };
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

// ─── Navigation mocks ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'test-project-1' } }),
}));

// ─── ViewModel mock ─────────────────────────────────────────────────────────
const mockVM = {
  currentStep: 3,
  completedSteps: [0, 1, 2],
  sourceFile: { name: 'test.xlsx', rowCount: 10 } as { name: string; rowCount: number } | null,
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
};

jest.mock('../../hooks/useValidationScreenViewModel', () => ({
  useValidationScreenViewModel: jest.fn(() => mockVM),
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
  });

  it('renders with testID "validation-screen"', () => {
    render(<ValidationScreen />);
    expect(screen.getByTestId('validation-screen')).toBeTruthy();
  });

  it('shows "Account Mapping" heading', () => {
    render(<ValidationScreen />);
    expect(screen.getByText('Account Mapping')).toBeTruthy();
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

  it('shows validation issues card when errors or warnings exist', () => {
    mockVM.errors = ['Missing account number'];
    mockVM.warnings = ['Low confidence match'];
    render(<ValidationScreen />);
    expect(screen.getByTestId('validation-issues-card')).toBeTruthy();
  });

  it('shows skeleton when no data is loaded', () => {
    mockVM.stats.totalAccounts = 0;
    mockVM.filteredMappings = [];
    render(<ValidationScreen />);
    expect(screen.getByTestId('validation-skeleton')).toBeTruthy();
  });
});
