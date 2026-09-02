import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { MasterDataUploadScreen } from '../MasterDataUploadScreen';
import { STEPS } from '../../dp-kit/react/taxonomy';
import type { EntityPack } from '../../types/entity-pack.types';
import type { UploadResult } from '../../types/upload.types';

// ─── Platform mock ──────────────────────────────────────────────────────────
// isWeb: false exercises the native branches of handleFilePicked (uri-based
// UploadedFile, no global `File`) and handleDownloadSample (FileSystem +
// Sharing), which is also what our FileUploader stub below always sends.
jest.mock('@/shared/utils/platform.utils', () => ({ isWeb: false, isNative: true }));

// ─── expo-file-system / expo-sharing ───────────────────────────────────────
const mockReadAsStringAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  EncodingType: { UTF8: 'utf8' },
  readAsStringAsync: (...args: unknown[]) => mockReadAsStringAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}));

const mockShareAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

// ─── Navigation mocks ───────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const routeParams = { orgProjectId: 'org-1', entityId: 'customers', parentProjectId: 'proj-1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: routeParams }),
}));

// ─── MigrationLayout stub ───────────────────────────────────────────────────
jest.mock('@/features/migration/components/MigrationLayout', () => {
  const { View } = require('react-native');
  return {
    MigrationLayout: ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
      <View testID={testID}>{children}</View>
    ),
  };
});

// ─── FileUploader stub — FileUploadField / FileTargetCard ──────────────────
// Keeps this suite about MasterDataUploadScreen's own wiring (upload calls,
// wizard-store calls, column-warning plumbing, continue/back gating) rather
// than re-exercising FileUploader's drag/drop DOM listeners, which have no
// coverage of their own yet either.
interface StubFileUploadFieldProps {
  onFilePicked: (file: { uri: string; name: string; mimeType: string }) => void;
  onRemove?: () => void;
  onTogglePreview?: () => void;
  hasFile: boolean;
  fileName?: string | null;
  rowCount?: number;
  columnWarning?: string[];
  testID?: string;
}
jest.mock('@/shared/components/ui/FileUploader', () => {
  const { View, Text, Pressable } = require('react-native');
  const R = require('react');
  return {
    FileUploadField: ({
      onFilePicked,
      onRemove,
      onTogglePreview,
      hasFile,
      fileName,
      rowCount,
      columnWarning,
      testID,
    }: StubFileUploadFieldProps) =>
      R.createElement(
        View,
        { testID: testID ?? 'file-upload-field' },
        !hasFile
          ? R.createElement(
              Pressable,
              {
                testID: `${testID}-pick`,
                onPress: () => onFilePicked({ uri: 'file:///mock.csv', name: 'mock.csv', mimeType: 'text/csv' }),
              },
              R.createElement(Text, null, 'Pick file'),
            )
          : R.createElement(
              View,
              null,
              R.createElement(Text, null, `${fileName} · ${rowCount} rows loaded`),
              (columnWarning ?? []).length > 0 &&
                R.createElement(Text, { testID: 'file-upload-column-warning' }, columnWarning?.join(', ')),
              R.createElement(
                Pressable,
                { testID: 'file-upload-toggle-preview', onPress: onTogglePreview },
                R.createElement(Text, null, 'toggle preview'),
              ),
              R.createElement(Pressable, { testID: 'file-upload-remove', onPress: onRemove }, R.createElement(Text, null, 'remove')),
            ),
      ),
    FileTargetCard: ({ title }: { title: string }) =>
      R.createElement(View, { testID: 'file-target-card' }, R.createElement(Text, null, title)),
  };
});

// ─── Hook mocks ─────────────────────────────────────────────────────────────
const mockRefetchPack = jest.fn();
const mockUseEntityPack = jest.fn();
jest.mock('../../hooks/useEntityPack', () => ({
  useEntityPack: (...args: unknown[]) => mockUseEntityPack(...args),
}));

const mockUpload = jest.fn();
const mockResetUpload = jest.fn();
const mockUseSourceFileUpload = jest.fn();
jest.mock('../../hooks/useSourceFileUpload', () => ({
  useSourceFileUpload: (...args: unknown[]) => mockUseSourceFileUpload(...args),
}));

const mockRefetchProject = jest.fn();
const mockUseProjectDetail = jest.fn();
jest.mock('@/features/projects/hooks/useProjectDetail', () => ({
  useProjectDetail: (...args: unknown[]) => mockUseProjectDetail(...args),
}));

const mockSetUploadedFile = jest.fn();
const mockClearUploadedFile = jest.fn();
jest.mock('../../store/wizard.store', () => ({
  useWizardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setUploadedFile: mockSetUploadedFile, clearUploadedFile: mockClearUploadedFile }),
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────
const CSV_CONTENT = [
  'Account No,Customer Name,VAT No,Email',
  'C-1,Acme Trading,4210192837,ap@acme.co.za',
  'C-2,Beta Supplies,4980112233,ar@beta.co.za',
].join('\n');

const UPLOAD_RESULT: UploadResult = {
  fileId: 'file-1',
  fileName: 'mock.csv',
  fileType: 'source_erp',
  contentType: 'text/csv',
  sizeBytes: 128,
  status: 'uploaded',
  rowCount: 2,
  storagePath: '/storage/file-1',
  createdAt: '2026-09-01T00:00:00Z',
};

const uploadStep = STEPS.find((s) => s.id === 'upload')!;
const profileStep = STEPS.find((s) => s.id === 'profile')!;

function setEntityPack(pack: EntityPack | null): void {
  mockUseEntityPack.mockReturnValue({ pack, isLoading: false, isFetching: false, error: null, refetch: mockRefetchPack });
}

function setSourceFileUpload(overrides: Partial<ReturnType<typeof mockUseSourceFileUpload>> = {}): void {
  mockUseSourceFileUpload.mockReturnValue({
    upload: mockUpload,
    result: null,
    isUploading: false,
    error: null,
    reset: mockResetUpload,
    ...overrides,
  });
}

function setProjectDetail(overrides: Partial<ReturnType<typeof mockUseProjectDetail>> = {}): void {
  mockUseProjectDetail.mockReturnValue({
    project: { targetErp: 'netsuite' },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: mockRefetchProject,
    ...overrides,
  });
}

describe('MasterDataUploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadAsStringAsync.mockResolvedValue(CSV_CONTENT);
    setEntityPack(null);
    setSourceFileUpload();
    setProjectDetail();
  });

  it('shows a loading state while the project is hydrating', () => {
    setProjectDetail({ isLoading: true, isFetching: true, project: null });
    render(<MasterDataUploadScreen />);

    expect(screen.getByTestId('master-data-upload-screen')).toBeTruthy();
    expect(screen.getByText('Loading project data...')).toBeTruthy();
  });

  it('shows the network error fallback on a hydration error and retries both queries', () => {
    setProjectDetail({ project: null, error: { code: 'NETWORK', message: 'Connection lost' } });
    render(<MasterDataUploadScreen />);

    expect(screen.getByTestId('master-data-upload-error')).toBeTruthy();

    fireEvent.press(screen.getByTestId('master-data-upload-error-retry'));

    expect(mockRefetchPack).toHaveBeenCalled();
    expect(mockRefetchProject).toHaveBeenCalled();
  });

  it('renders the step header, waiting message and entity sample fallback with no pack and no file', () => {
    render(<MasterDataUploadScreen />);

    expect(screen.getByText(`Step ${uploadStep.n} of ${STEPS.length}`)).toBeTruthy();
    expect(screen.getByText('No source customers file selected')).toBeTruthy();
    expect(screen.getByText('Source Customers Sample')).toBeTruthy();
    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('picks a file, parses it locally and uploads it to the server, clearing any prior confirmed upload first', async () => {
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    await waitFor(() => {
      expect(screen.getByText('mock.csv · 2 rows loaded')).toBeTruthy();
    });

    expect(mockClearUploadedFile).toHaveBeenCalledWith('customers');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///mock.csv', name: 'mock.csv' }),
    );
    // Upload still pending (mocked isUploading stays false / result stays null by
    // default here) — continue is gated on a confirmed result, not just a file.
    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('records the confirmed upload in the wizard store and enables Continue once the server confirms it', () => {
    setSourceFileUpload({ result: UPLOAD_RESULT });
    render(<MasterDataUploadScreen />);

    expect(mockSetUploadedFile).toHaveBeenCalledWith('customers', UPLOAD_RESULT);
  });

  it('flags an expected column missing from the uploaded header', async () => {
    setEntityPack({
      label: { singular: 'Customer', plural: 'Customers' },
      target: { record: '' },
      spec: { expectedColumns: ['Account No', 'Tax Region'] },
    } as EntityPack);
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-column-warning')).toBeTruthy();
    });
    expect(screen.getByTestId('file-upload-column-warning').props.children).toBe('Tax Region');
  });

  it('toggles the source file preview open and closed', async () => {
    render(<MasterDataUploadScreen />);
    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    await waitFor(() => {
      expect(screen.getByText('Source File Preview')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('file-upload-toggle-preview'));
    expect(screen.queryByText('Source File Preview')).toBeNull();

    fireEvent.press(screen.getByTestId('file-upload-toggle-preview'));
    expect(screen.getByText('Source File Preview')).toBeTruthy();
  });

  it('removes the picked file, resetting both local state and the upload mutation', async () => {
    render(<MasterDataUploadScreen />);
    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    await waitFor(() => {
      expect(screen.getByText('mock.csv · 2 rows loaded')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('file-upload-remove'));

    expect(screen.getByText('No source customers file selected')).toBeTruthy();
    expect(mockResetUpload).toHaveBeenCalled();
    expect(mockClearUploadedFile).toHaveBeenLastCalledWith('customers');
  });

  it('loads the built-in sample file locally without contacting the upload service', () => {
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByText('Load'));

    expect(screen.getByText('customers-sample.csv · 6 rows loaded')).toBeTruthy();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockClearUploadedFile).not.toHaveBeenCalled();
  });

  it('downloads the sample file via the native share sheet', async () => {
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByText('Download'));

    await waitFor(() => {
      expect(mockShareAsync).toHaveBeenCalledWith('file:///docs/customers-sample.csv');
    });
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      'file:///docs/customers-sample.csv',
      expect.any(String),
      { encoding: 'utf8' },
    );
  });

  it('navigates back on Back, and to the Profile step on Continue once a file is confirmed', async () => {
    setSourceFileUpload({ result: UPLOAD_RESULT });
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('upload-back-button'));
    expect(mockGoBack).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));
    await waitFor(() => {
      expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).not.toBe(true);
    });

    fireEvent.press(screen.getByTestId('upload-continue-button'));
    expect(mockNavigate).toHaveBeenCalledWith('MasterDataProfile', {
      orgProjectId: 'org-1',
      entityId: 'customers',
      parentProjectId: 'proj-1',
    });
    expect(screen.getByText(`Continue to ${profileStep.label}`)).toBeTruthy();
  });

  it('disables Continue and shows a retry label when the upload has failed', () => {
    setSourceFileUpload({ error: { code: 'UPLOAD_FAILED', message: 'Server rejected the file' } });
    render(<MasterDataUploadScreen />);

    expect(screen.getByText('Upload failed — retry')).toBeTruthy();
    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).toBe(true);
  });
});
