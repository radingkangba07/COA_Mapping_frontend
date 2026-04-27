import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// ─── Icon mock ──────────────────────────────────────────────────────────────
jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const R = require('react');
  const icon = (name: string) => (props: Record<string, unknown>) =>
    R.createElement(RN.View, { testID: `${name}-icon`, ...props });
  return {
    Download: icon('Download'),
    CheckCircle2: icon('CheckCircle2'),
    ArrowLeft: icon('ArrowLeft'),
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

// ─── Preview ViewModel mock ─────────────────────────────────────────────────
const mockResetMigration = jest.fn();
const mockHandleBack = jest.fn();
const mockPreviewVM = {
  currentStep: 4,
  completedSteps: [0, 1, 2, 3],
  stats: {
    totalTypes: 2,
    totalAccounts: 5,
    highConfidence: 3,
    mediumConfidence: 1,
    lowConfidence: 1,
    confirmedCount: 5,
  },
  groupedMappings: [
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
          changed_by_name: null,
          changed_at: null,
        },
      ],
    },
  ],
  projectId: 'test-project-1',
  handleStepPress: jest.fn(),
  handleBack: mockHandleBack,
  resetMigration: mockResetMigration,
};

jest.mock('../../hooks/usePreviewScreenViewModel', () => ({
  usePreviewScreenViewModel: jest.fn(() => mockPreviewVM),
}));

jest.mock('../../hooks/useHydrateProject', () => ({
  useHydrateProject: () => ({ isHydrating: false, error: null, retry: jest.fn() }),
}));

// ─── Export ViewModel mock ──────────────────────────────────────────────────
const mockPerformExport = jest.fn();
const mockMarkComplete = jest.fn().mockResolvedValue(true);
const mockExportVM = {
  performExport: mockPerformExport,
  markComplete: mockMarkComplete,
  changeFormat: jest.fn(),
  isExporting: false,
  isCompleting: false,
  exportFormat: 'xlsx',
};

jest.mock('@/features/export/hooks/useExportViewModel', () => ({
  useExportViewModel: jest.fn(() => mockExportVM),
}));

// ─── Online guard mock ──────────────────────────────────────────────────────
let mockIsOnline = true;
jest.mock('@/shared/hooks/useOnlineGuard', () => ({
  useOnlineGuard: () => ({ isOnline: mockIsOnline }),
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

jest.mock('@/features/export/components/ExportFormatPicker', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    ExportFormatPicker: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'export-format-picker' }),
  };
});

jest.mock('@/shared/components/feedback/EmptyState', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    EmptyState: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'empty-state' }),
  };
});

// ─── Config mocks ───────────────────────────────────────────────────────────
jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', primaryForeground: '#FAFAFA' },
}));

jest.mock('@/shared/constants/mapping-confidence', () => ({
  getConfidenceBgClass: () => 'bg-green-100',
  getConfidenceTextClass: () => 'text-green-700',
}));

// ─── Tests ──────────────────────────────────────────────────────────────────
import { PreviewScreen } from '../PreviewScreen';

describe('PreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = true;
    mockExportVM.isExporting = false;
    mockExportVM.isCompleting = false;
    mockMarkComplete.mockResolvedValue(true);
    mockPreviewVM.groupedMappings = [
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
            changed_by_name: null,
            changed_at: null,
          },
        ],
      },
    ];
  });

  it('renders with testID "preview-screen"', () => {
    render(<PreviewScreen />);
    expect(screen.getByTestId('preview-screen')).toBeTruthy();
  });

  it('shows "Export Preview" heading', () => {
    render(<PreviewScreen />);
    expect(screen.getByText('Export Preview')).toBeTruthy();
  });

  it('renders stat cards', () => {
    render(<PreviewScreen />);
    expect(screen.getByTestId('stat-types')).toBeTruthy();
    expect(screen.getByTestId('stat-accounts')).toBeTruthy();
    expect(screen.getByTestId('stat-high')).toBeTruthy();
    expect(screen.getByTestId('stat-review')).toBeTruthy();
  });

  it('shows empty state when no mappings exist', () => {
    mockPreviewVM.groupedMappings = [];
    render(<PreviewScreen />);
    expect(screen.getByTestId('preview-empty-state')).toBeTruthy();
  });

  it('shows mapping table when mappings exist', () => {
    render(<PreviewScreen />);
    expect(screen.getByTestId('mapping-preview-table')).toBeTruthy();
  });

  it('triggers export when Download button is pressed', () => {
    render(<PreviewScreen />);
    const button = screen.getByTestId('download-button');
    fireEvent.press(button);
    expect(mockPerformExport).toHaveBeenCalled();
  });

  it('disables Download button when not online', () => {
    mockIsOnline = false;
    render(<PreviewScreen />);
    const button = screen.getByTestId('download-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not render a Start New button', () => {
    render(<PreviewScreen />);
    expect(screen.queryByTestId('start-new-button')).toBeNull();
  });

  it('renders a Complete button', () => {
    render(<PreviewScreen />);
    expect(screen.getByTestId('complete-button')).toBeTruthy();
  });

  it('calls markComplete when Complete button is pressed', () => {
    render(<PreviewScreen />);
    const button = screen.getByTestId('complete-button');
    fireEvent.press(button);
    expect(mockMarkComplete).toHaveBeenCalled();
  });

  it('disables Complete button when not online', () => {
    mockIsOnline = false;
    render(<PreviewScreen />);
    const button = screen.getByTestId('complete-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables Complete button while completing', () => {
    mockExportVM.isCompleting = true;
    render(<PreviewScreen />);
    const button = screen.getByTestId('complete-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders ExportFormatPicker', () => {
    render(<PreviewScreen />);
    expect(screen.getByTestId('export-format-picker')).toBeTruthy();
  });
});
