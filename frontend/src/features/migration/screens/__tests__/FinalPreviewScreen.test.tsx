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
    { get: (_: Record<string, unknown>, prop: string) => icon(prop) },
  );
});

// ─── Platform / Safe-area mocks ─────────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    SafeAreaView: (props: Record<string, unknown>) => R.createElement(RN.View, props),
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../../components/MigrationLayout', () => {
  const { View } = require('react-native');
  return {
    MigrationLayout: ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
      <View testID={testID}>{children}</View>
    ),
  };
});

// ─── Navigation mocks ───────────────────────────────────────────────────────
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'proj-1' } }),
}));

// ─── Shared component stubs ─────────────────────────────────────────────────
jest.mock('@/shared/components/ui/Card', () => {
  const RN = require('react-native');
  const R = require('react');
  const CardContent = (props: Record<string, unknown>) => R.createElement(RN.View, props);
  const Card = (props: Record<string, unknown>) => R.createElement(RN.View, props);
  Card.Content = CardContent;
  return { Card };
});

jest.mock('@/shared/components/ui/Badge', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Badge: ({ children, testID }: { children: React.ReactNode; testID?: string }) =>
      R.createElement(RN.View, { testID: testID ?? 'badge' }, children),
  };
});

jest.mock('@/shared/components/ui/Button', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Button: ({
      children,
      onPress,
      testID,
      disabled,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      disabled?: boolean;
      accessibilityLabel?: string;
    }) =>
      R.createElement(
        RN.Pressable,
        { testID, onPress, disabled, accessibilityLabel, accessibilityState: { disabled: !!disabled } },
        children,
      ),
  };
});

jest.mock('@/shared/components/ui/Spinner', () => {
  const R = require('react');
  const RN = require('react-native');
  return { Spinner: () => R.createElement(RN.View, { testID: 'spinner' }) };
});

jest.mock('@/shared/components/feedback/NetworkErrorFallback', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    NetworkErrorFallback: ({ testID, onRetry }: { testID?: string; onRetry?: () => void }) =>
      R.createElement(
        RN.View,
        { testID },
        R.createElement(RN.Pressable, { testID: 'retry-button', onPress: onRetry }),
      ),
  };
});

jest.mock('../../components/MigrationStepper/MigrationStepper', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    MigrationStepper: () => R.createElement(RN.View, { testID: 'migration-stepper' }),
  };
});

// ─── Utility / config mocks ─────────────────────────────────────────────────
jest.mock('@/shared/utils/string.utils', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', primary: '#2563EB', mutedForeground: '#71717A' },
}));

jest.mock('@/shared/types/common.types', () => ({
  createProjectId: (id: string) => id,
}));

jest.mock('@/shared/constants/migration-steps', () => ({
  STEP_TO_SCREEN: { 1: 'ERPSelect', 2: 'Mapping', 3: 'Validation', 4: 'FinalPreview' },
}));

// ─── Zustand shallow mock ───────────────────────────────────────────────────
jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: (s: unknown) => unknown) => fn,
}));

// ─── Selector mock ──────────────────────────────────────────────────────────
jest.mock('../../store/migration.selectors', () => ({
  selectMappingStats: (s: { stats?: Record<string, unknown> }) =>
    s.stats ?? {
      totalTypes: 2,
      totalAccounts: 5,
      highConfidence: 3,
      mediumConfidence: 1,
      lowConfidence: 1,
      confirmedCount: 0,
    },
}));

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockCompleteStep = jest.fn();
const mockSetStep = jest.fn();

let mockStoreState: Record<string, unknown> = {};

function buildStoreState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    groupedMappings: [],
    currentStep: 3,
    completedSteps: [0, 1, 2],
    sourceFile: { name: 'accounts.xlsx', rowCount: 10 },
    completeStep: mockCompleteStep,
    setStep: mockSetStep,
    stats: {
      totalTypes: 2,
      totalAccounts: 5,
      highConfidence: 3,
      mediumConfidence: 1,
      lowConfidence: 1,
      confirmedCount: 2,
    },
    ...overrides,
  };
}

jest.mock('../../store/migration.store', () => ({
  useMigrationStore: jest.fn((selector?: (s: unknown) => unknown) => {
    const state = mockStoreState;
    return selector ? selector(state) : state;
  }),
}));

// ─── Hook mocks ─────────────────────────────────────────────────────────────
const mockRetry = jest.fn();
let mockHydrate = { isHydrating: false, error: null as { message: string } | null, retry: mockRetry };

jest.mock('../../hooks/useHydrateProject', () => ({
  useHydrateProject: () => mockHydrate,
}));

const mockSave = jest.fn().mockResolvedValue(true);
let mockSaveMappings = { save: mockSave, isSaving: false };

jest.mock('../../hooks/useSaveMappings', () => ({
  useSaveMappings: () => mockSaveMappings,
}));

// ─── Import under test ──────────────────────────────────────────────────────
import { FinalPreviewScreen } from '../FinalPreviewScreen';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeAccount(
  score: number,
  name: string,
  num: string,
  status?: string,
  is_active?: boolean,
): Record<string, unknown> {
  return {
    source_number: num,
    source_name: name,
    target_name: `T-${name}`,
    target_number: null,
    target_type: 'Assets',
    score,
    remark: '',
    status,
    is_active,
  };
}

function makeGroup(accounts: Record<string, unknown>[]): Record<string, unknown> {
  return { source_type: 'Asset', target_type: 'Assets', confidence: 90, accounts };
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('FinalPreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrate = { isHydrating: false, error: null, retry: mockRetry };
    mockSaveMappings = { save: mockSave, isSaving: false };
    mockStoreState = buildStoreState();
  });

  describe('loading state', () => {
    it('renders testID "final-preview-screen" while hydrating', () => {
      mockHydrate = { isHydrating: true, error: null, retry: mockRetry };
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('final-preview-screen')).toBeTruthy();
    });

    it('shows spinner while hydrating', () => {
      mockHydrate = { isHydrating: true, error: null, retry: mockRetry };
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('spinner')).toBeTruthy();
    });

    it('shows "Loading project data..." text while hydrating', () => {
      mockHydrate = { isHydrating: true, error: null, retry: mockRetry };
      render(<FinalPreviewScreen />);
      expect(screen.getByText('Loading project data...')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error fallback when hydration fails', () => {
      mockHydrate = { isHydrating: false, error: { message: 'Network error' }, retry: mockRetry };
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('final-preview-error')).toBeTruthy();
    });

    it('calls retry when retry button pressed', () => {
      mockHydrate = { isHydrating: false, error: { message: 'Network error' }, retry: mockRetry };
      render(<FinalPreviewScreen />);
      fireEvent.press(screen.getByTestId('retry-button'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('main content', () => {
    it('renders testID "final-preview-screen"', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('final-preview-screen')).toBeTruthy();
    });

    it('renders the migration stepper', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('migration-stepper')).toBeTruthy();
    });

    it('renders "COA Mapping" heading', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByText('COA Mapping')).toBeTruthy();
    });

    it('renders the final preview card', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('final-preview-card')).toBeTruthy();
    });

    it('renders the final preview table', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('final-preview-table')).toBeTruthy();
    });
  });

  describe('confirmed / not-confirmed badges', () => {
    it('shows confirmed count equal to status=confirmed rows', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [
          makeGroup([
            makeAccount(95, 'Cash', '1000', 'confirmed'),
            makeAccount(75, 'Debtors', '2000', 'confirmed'),
            makeAccount(50, 'Sundry', '3000', 'pending'),
          ]),
        ],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('2 Confirmed')).toBeTruthy();
    });

    it('shows not-confirmed count for non-confirmed active accounts', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [
          makeGroup([
            makeAccount(95, 'Cash', '1000', 'confirmed'),
            makeAccount(75, 'Debtors', '2000', 'pending'),
            makeAccount(50, 'Sundry', '3000', 'pending'),
          ]),
        ],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('2 Not Confirmed')).toBeTruthy();
    });

    it('excludes inactive accounts from both counts', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [
          makeGroup([
            makeAccount(95, 'Cash', '1000', 'confirmed'),
            makeAccount(92, 'Bank', '1001', 'confirmed', false),  // inactive
            makeAccount(50, 'Sundry', '3000', 'pending'),
          ]),
        ],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('1 Confirmed')).toBeTruthy();
      expect(screen.getByText('1 Not Confirmed')).toBeTruthy();
    });

    it('shows 0 Confirmed when no accounts are confirmed', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [makeGroup([makeAccount(75, 'Debtors', '2000', 'pending')])],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('0 Confirmed')).toBeTruthy();
    });
  });

  describe('table rows', () => {
    it('shows only confirmed accounts in the table', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [
          makeGroup([
            makeAccount(95, 'Cash', '1000', 'confirmed'),
            makeAccount(75, 'Debtors', '2000', 'pending'),
          ]),
        ],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('Cash')).toBeTruthy();
      expect(screen.queryByText('Debtors')).toBeNull();
    });

    it('shows all confirmed accounts from multiple groups', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [
          makeGroup([makeAccount(95, 'Cash', '1000', 'confirmed')]),
          {
            source_type: 'Liability',
            target_type: 'Liabilities',
            confidence: 90,
            accounts: [makeAccount(92, 'Creditors', '4000', 'confirmed')],
          },
        ],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('Cash')).toBeTruthy();
      expect(screen.getByText('Creditors')).toBeTruthy();
    });

    it('excludes inactive accounts from table even if confirmed', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [
          makeGroup([
            makeAccount(95, 'Cash', '1000', 'confirmed'),
            makeAccount(92, 'Bank', '1001', 'confirmed', false),
          ]),
        ],
      });
      render(<FinalPreviewScreen />);
      expect(screen.getByText('Cash')).toBeTruthy();
      expect(screen.queryByText('Bank')).toBeNull();
    });

    it('renders empty table when no accounts are confirmed', () => {
      mockStoreState = buildStoreState({
        groupedMappings: [makeGroup([makeAccount(75, 'Debtors', '2000', 'pending')])],
      });
      render(<FinalPreviewScreen />);
      expect(screen.queryByText('Debtors')).toBeNull();
    });
  });

  describe('buttons', () => {
    it('renders Continue to Export button', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('continue-to-export')).toBeTruthy();
    });

    it('renders Back to Mapping button', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('back-to-mapping')).toBeTruthy();
    });

    it('renders Edit button', () => {
      render(<FinalPreviewScreen />);
      expect(screen.getByTestId('edit-mappings')).toBeTruthy();
    });

    it('Back to Mapping calls navigation.goBack', () => {
      render(<FinalPreviewScreen />);
      fireEvent.press(screen.getByTestId('back-to-mapping'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('Edit button calls navigation.goBack', () => {
      render(<FinalPreviewScreen />);
      fireEvent.press(screen.getByTestId('edit-mappings'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('Continue to Export calls save and navigates on success', async () => {
      mockSave.mockResolvedValue(true);
      render(<FinalPreviewScreen />);
      await fireEvent.press(screen.getByTestId('continue-to-export'));
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('does not navigate when save returns false', async () => {
      mockSave.mockResolvedValue(false);
      render(<FinalPreviewScreen />);
      await fireEvent.press(screen.getByTestId('continue-to-export'));
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('Continue to Export is disabled while saving', () => {
      mockSaveMappings = { save: mockSave, isSaving: true };
      render(<FinalPreviewScreen />);
      const button = screen.getByTestId('continue-to-export');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('source file info', () => {
    it('renders source file name when sourceFile is set', () => {
      mockStoreState = buildStoreState({ sourceFile: { name: 'accounts.xlsx', rowCount: 42 } });
      render(<FinalPreviewScreen />);
      expect(screen.getByText(/accounts\.xlsx/)).toBeTruthy();
    });

    it('does not render file info when sourceFile is null', () => {
      mockStoreState = buildStoreState({ sourceFile: null });
      render(<FinalPreviewScreen />);
      expect(screen.queryByText(/accounts\.xlsx/)).toBeNull();
    });
  });
});
