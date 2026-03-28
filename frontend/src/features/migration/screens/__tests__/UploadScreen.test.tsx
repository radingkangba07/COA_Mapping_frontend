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

// ─── Navigation mocks ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'test-project-1' } }),
}));

// ─── ViewModel mock ─────────────────────────────────────────────────────────
const mockViewModel = {
  currentStep: 1,
  completedSteps: [0],
  sourceERP: { id: 'sap', name: 'SAP' },
  targetERP: { id: 'netsuite', name: 'NetSuite' },
  sourceFile: null,
  targetFile: null,
  mappingFile: null,
  isLoading: false,
  canProceedFromStep1: false,
  goToStep: jest.fn(),
  handleSourceFilePicked: jest.fn(),
  handleTargetFilePicked: jest.fn(),
  handleMappingFilePicked: jest.fn(),
  handleRemoveSourceFile: jest.fn(),
  handleRemoveTargetFile: jest.fn(),
  handleRemoveMappingFile: jest.fn(),
  handleDownloadSample: jest.fn(),
  processFiles: jest.fn(),
};

jest.mock('../../hooks/useMigrationViewModel', () => ({
  useMigrationViewModel: jest.fn(() => mockViewModel),
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

jest.mock('../../components/FileUploader/FileUploader', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    FileUploader: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: props.testID ?? 'file-uploader' }),
  };
});

// ─── Config mock ────────────────────────────────────────────────────────────
jest.mock('@/config/theme', () => ({
  colors: { mutedForeground: '#71717A', foreground: '#09090B', primaryForeground: '#FAFAFA' },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────
import { UploadScreen } from '../UploadScreen';

describe('UploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockViewModel.canProceedFromStep1 = false;
    mockViewModel.isLoading = false;
  });

  it('renders with testID "upload-screen"', () => {
    render(<UploadScreen />);
    expect(screen.getByTestId('upload-screen')).toBeTruthy();
  });

  it('shows FileUploader component', () => {
    render(<UploadScreen />);
    expect(screen.getByTestId('upload-file-uploader')).toBeTruthy();
  });

  it('renders Process Files button disabled when canProceedFromStep1 is false', () => {
    mockViewModel.canProceedFromStep1 = false;
    render(<UploadScreen />);
    const button = screen.getByTestId('upload-continue-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders Process Files button enabled when canProceedFromStep1 is true', () => {
    mockViewModel.canProceedFromStep1 = true;
    render(<UploadScreen />);
    const button = screen.getByTestId('upload-continue-button');
    expect(button.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('renders Back button', () => {
    render(<UploadScreen />);
    expect(screen.getByTestId('upload-back-button')).toBeTruthy();
  });

  it('shows ERP summary card', () => {
    render(<UploadScreen />);
    expect(screen.getByTestId('upload-erp-summary')).toBeTruthy();
  });

  it('navigates back when Back button pressed', () => {
    render(<UploadScreen />);
    fireEvent.press(screen.getByTestId('upload-back-button'));
    expect(mockNavigate).toHaveBeenCalledWith('ERPSelect', { projectId: 'test-project-1' });
  });

  it('calls processFiles when Process Files button pressed', async () => {
    mockViewModel.canProceedFromStep1 = true;
    mockViewModel.processFiles.mockResolvedValue(undefined);
    render(<UploadScreen />);
    fireEvent.press(screen.getByTestId('upload-continue-button'));
    expect(mockViewModel.processFiles).toHaveBeenCalled();
  });
});
