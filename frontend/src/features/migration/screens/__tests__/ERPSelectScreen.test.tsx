import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ──────────────────────────────────────────────────────────────────

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

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const icon =
    (name: string) =>
    (props: Record<string, unknown>) => <View testID={`${name}-icon`} {...props} />;
  return {
    ArrowRight: icon('ArrowRight'),
    Check: icon('Check'),
    __esModule: true,
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

jest.mock('../../components/MigrationLayout', () => {
  const { View } = require('react-native');
  return {
    MigrationLayout: ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
      <View testID={testID}>{children}</View>
    ),
  };
});

jest.mock('@/config/theme', () => ({
  colors: { mutedForeground: '#6B6B73' },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({
    params: { projectId: 'test-project-1' },
  }),
}));

const mockGoToStep = jest.fn();
const mockHandleSourceSelect = jest.fn();
const mockHandleTargetSelect = jest.fn();

const defaultMigrationViewModel = {
  currentStep: 0,
  completedSteps: [] as number[],
  sourceERP: null as { id: string; name: string } | null,
  targetERP: null as { id: string; name: string } | null,
  sourceFile: null,
  targetFile: null,
  mappingFile: null,
  isLoading: false,
  error: null,
  canProceedFromStep0: false,
  canProceedFromStep1: false,
  handleSourceSelect: mockHandleSourceSelect,
  handleTargetSelect: mockHandleTargetSelect,
  goToStep: mockGoToStep,
  handleSourceFilePicked: jest.fn(),
  handleTargetFilePicked: jest.fn(),
  handleMappingFilePicked: jest.fn(),
  handleRemoveSourceFile: jest.fn(),
  handleRemoveTargetFile: jest.fn(),
  handleRemoveMappingFile: jest.fn(),
  processFiles: jest.fn(),
  handleDownloadSample: jest.fn(),
};

const mockUseMigrationViewModel = jest.fn(() => ({ ...defaultMigrationViewModel }));

jest.mock('../../hooks/useMigrationViewModel', () => ({
  useMigrationViewModel: () => mockUseMigrationViewModel(),
}));

jest.mock('../../hooks/useHydrateProject', () => ({
  useHydrateProject: () => ({ isHydrating: false, error: null, retry: jest.fn() }),
}));

const erpSystems = [
  { id: 'sap', name: 'SAP' },
  { id: 'netsuite', name: 'NetSuite' },
  { id: 'xero', name: 'Xero' },
];

jest.mock('@/features/erp-config/hooks/useERPConfig', () => ({
  useERPConfig: () => ({ erpSystems }),
}));

jest.mock('@/features/projects/services/projects.service', () => ({
  updateProject: jest.fn().mockResolvedValue({ ok: true, data: {} }),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

// Mock complex child components
jest.mock('../../components/MigrationStepper/MigrationStepper', () => ({
  MigrationStepper: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID="migration-stepper" {...props} />;
  },
}));

jest.mock('../../components/ERPCombobox/ERPCombobox', () => ({
  ERPCombobox: (props: {
    testID: string;
    placeholder: string;
    value: string | null;
    onSelect: (id: string) => void;
  }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID={props.testID}>
        <Text>{props.placeholder}</Text>
        <Pressable
          testID={`${props.testID}-trigger`}
          onPress={() => props.onSelect('sap')}
        />
      </View>
    );
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { ERPSelectScreen } from '../ERPSelectScreen';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ERPSelectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMigrationViewModel.mockReturnValue({ ...defaultMigrationViewModel });
  });

  it('renders the screen with testID', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByTestId('erp-select-screen')).toBeTruthy();
  });

  it('shows "Select ERP Systems" heading', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByText('Select ERP Systems')).toBeTruthy();
  });

  it('shows description text', () => {
    render(<ERPSelectScreen />);
    expect(
      screen.getByText(
        'Choose the source and target ERP systems for your chart of accounts migration.',
      ),
    ).toBeTruthy();
  });

  it('renders the migration stepper', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByTestId('migration-stepper')).toBeTruthy();
  });

  it('renders the ERP selection card', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByTestId('erp-selection-card')).toBeTruthy();
  });

  it('renders source ERP combobox', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByTestId('source-erp-combobox')).toBeTruthy();
    expect(screen.getByText('Select Source ERP')).toBeTruthy();
  });

  it('renders target ERP combobox', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByTestId('target-erp-combobox')).toBeTruthy();
    expect(screen.getByText('Select Target ERP')).toBeTruthy();
  });

  it('renders the continue button', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByTestId('continue-button')).toBeTruthy();
    expect(screen.getByText('Continue to Upload')).toBeTruthy();
  });

  it('disables continue button when canProceedFromStep0 is false', () => {
    render(<ERPSelectScreen />);
    const button = screen.getByTestId('continue-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables continue button when canProceedFromStep0 is true', () => {
    mockUseMigrationViewModel.mockReturnValue({
      ...defaultMigrationViewModel,
      sourceERP: { id: 'sap', name: 'SAP' },
      targetERP: { id: 'netsuite', name: 'NetSuite' },
      canProceedFromStep0: true,
    });

    render(<ERPSelectScreen />);
    const button = screen.getByTestId('continue-button');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('does not show summary card when no ERPs are selected', () => {
    render(<ERPSelectScreen />);
    expect(screen.queryByTestId('erp-summary-card')).toBeNull();
  });

  it('shows summary card when both ERPs are selected', () => {
    mockUseMigrationViewModel.mockReturnValue({
      ...defaultMigrationViewModel,
      sourceERP: { id: 'sap', name: 'SAP' },
      targetERP: { id: 'netsuite', name: 'NetSuite' },
      canProceedFromStep0: true,
    });

    render(<ERPSelectScreen />);
    expect(screen.getByTestId('erp-summary-card')).toBeTruthy();
  });

  it('shows migration direction text in summary card', () => {
    mockUseMigrationViewModel.mockReturnValue({
      ...defaultMigrationViewModel,
      sourceERP: { id: 'sap', name: 'SAP' },
      targetERP: { id: 'xero', name: 'Xero' },
      canProceedFromStep0: true,
    });

    render(<ERPSelectScreen />);

    const summaryTexts = [
      'Migrating from',
      'SAP',
      'Xero',
    ];
    for (const text of summaryTexts) {
      expect(screen.getByText(new RegExp(text))).toBeTruthy();
    }
  });

  it('navigates to Upload on continue press', async () => {
    mockUseMigrationViewModel.mockReturnValue({
      ...defaultMigrationViewModel,
      sourceERP: { id: 'sap', name: 'SAP' },
      targetERP: { id: 'netsuite', name: 'NetSuite' },
      canProceedFromStep0: true,
    });

    render(<ERPSelectScreen />);
    fireEvent.press(screen.getByTestId('continue-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Upload', {
        projectId: 'test-project-1',
      });
    });
  });

  it('shows Source ERP and Target ERP labels', () => {
    render(<ERPSelectScreen />);
    expect(screen.getByText('Source ERP')).toBeTruthy();
    expect(screen.getByText('Target ERP')).toBeTruthy();
  });
});
