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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'test-project-1' } }),
}));

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockStoreState = {
  currentStep: 2,
  completedSteps: [0, 1],
  typeMappingRows: [
    { id: '1', sourceType: 'Asset', targetType: 'Asset', isCustom: false },
  ],
  targetTypes: ['Asset', 'Liability', 'Equity'],
  isLoading: false,
  updateTypeMappingRow: jest.fn(),
  addTypeMappingRow: jest.fn(),
  deleteTypeMappingRow: jest.fn(),
  setStep: jest.fn(),
  completeStep: jest.fn(),
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

// ─── Hook mocks ─────────────────────────────────────────────────────────────
const mockRunMapping = jest.fn();
jest.mock('../../hooks/useFuzzyMapper', () => ({
  useFuzzyMapper: () => ({ runMapping: mockRunMapping, isMapping: false }),
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

jest.mock('../../components/FieldMappingTable/FieldMappingTable', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    FieldMappingTable: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'field-mapping-table' }),
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
      { id: '1', sourceType: 'Asset', targetType: 'Asset', isCustom: false },
    ];
    mockAllMatched = true;
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

  it('calls runMapping when Proceed button is pressed', async () => {
    mockRunMapping.mockResolvedValue(undefined);
    render(<MappingScreen />);
    const button = screen.getByTestId('mapping-proceed-button');
    await fireEvent.press(button);
    expect(mockRunMapping).toHaveBeenCalled();
  });
});
