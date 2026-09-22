// UploadScreen conditional-render coverage (DA-52 / DA-155): when the project
// method is 'mcp' the screen shows the Fetch-from-ERP step; when it is 'csv' it
// shows the CSV FileUploader. Heavy deps and both child components are mocked to
// simple markers so the test isolates the branch decision.

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { UseFetchFromErpResult } from '../../hooks/useFetchFromErp';

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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('@/navigation/types', () => ({
  useMigrationScreenRoute: () => ({ params: { projectId: 'test-project-1' } }),
}));

// ─── ViewModel + hydration mocks ────────────────────────────────────────────
jest.mock('../../hooks/useMigrationViewModel', () => ({
  useMigrationViewModel: jest.fn(() => ({
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
    handlePreviewSample: jest.fn(),
    processFiles: jest.fn(),
    previewData: null,
    previewTitle: '',
    isPreviewOpen: false,
    closePreview: jest.fn(),
  })),
}));

jest.mock('../../hooks/useHydrateProject', () => ({
  useHydrateProject: () => ({ isHydrating: false, error: null, retry: jest.fn() }),
}));

// ─── Fetch-from-ERP hook mock (the branch driver) ───────────────────────────
const baseFetchVm: UseFetchFromErpResult = {
  method: 'mcp',
  connectionReady: false,
  sourceErpName: 'SAP',
  targetErpName: 'NetSuite',
  fetch: {
    status: 'idle',
    progress: 0,
    counts: { source: 0, target: 0 },
    sampleSource: [],
    sampleTarget: [],
    errorMessage: null,
  },
  runFetch: jest.fn(),
  refetch: jest.fn(),
  useCsvFallback: jest.fn(),
};

const mockUseFetchFromErp = jest.fn<UseFetchFromErpResult, []>(() => baseFetchVm);
jest.mock('../../hooks/useFetchFromErp', () => ({
  useFetchFromErp: () => mockUseFetchFromErp(),
}));

// ─── Child component markers ────────────────────────────────────────────────
jest.mock('../../components/MigrationStepper/MigrationStepper', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    MigrationStepper: () => R.createElement(RN.View, { testID: 'migration-stepper' }),
  };
});

jest.mock('../../components/FetchFromErpStep/FetchFromErpStep', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    FetchFromErpStep: () => R.createElement(RN.View, { testID: 'fetch-from-erp-step-marker' }),
  };
});

jest.mock('../../components/FileUploader/FileUploader', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    FileUploader: () => R.createElement(RN.View, { testID: 'file-uploader-marker' }),
  };
});

jest.mock('../../components/SampleFilesTable', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    SampleFilesTable: () => R.createElement(RN.View, { testID: 'sample-files-marker' }),
  };
});

// ─── Config mock ────────────────────────────────────────────────────────────
jest.mock('@/config/theme', () => ({
  colors: { mutedForeground: '#71717A', foreground: '#09090B', primaryForeground: '#FAFAFA' },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────
import { UploadScreen } from '../UploadScreen';

describe('UploadScreen — method branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchFromErp.mockReturnValue(baseFetchVm);
  });

  it('renders the Fetch-from-ERP step when method is "mcp"', () => {
    mockUseFetchFromErp.mockReturnValue({ ...baseFetchVm, method: 'mcp' });
    render(<UploadScreen />);

    expect(screen.getByTestId('fetch-from-erp-step-marker')).toBeTruthy();
    expect(screen.queryByTestId('file-uploader-marker')).toBeNull();
  });

  it('renders the CSV FileUploader when method is "csv"', () => {
    mockUseFetchFromErp.mockReturnValue({ ...baseFetchVm, method: 'csv' });
    render(<UploadScreen />);

    expect(screen.getByTestId('file-uploader-marker')).toBeTruthy();
    expect(screen.queryByTestId('fetch-from-erp-step-marker')).toBeNull();
  });
});
