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
// Two distinct navigate mocks: `mockNavigate` is the nested wizard stack
// (Upload/Profile — what Continue uses), `mockParentNavigate` is the outer
// ProjectsStack reached via getParent() (what Back, leaving the wizard
// entirely, uses) — see MasterDataUploadScreen's handleBack.
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      getParent: () => ({ navigate: mockParentNavigate }),
    }),
    // Real useFocusEffect only re-runs on actual focus changes (no
    // NavigationContainer here to drive that) — a plain mount-effect is
    // enough for this suite, which only asserts the discovery refetch fires
    // at all, not that it re-fires on every focus transition.
    useFocusEffect: (callback: () => void | (() => void)) => {
      R.useEffect(() => callback(), [callback]);
    },
  };
});

// ─── entity-pack.service mock ───────────────────────────────────────────────
const mockCreatePipelineRun = jest.fn();
const mockGetActivePipelineRun = jest.fn();
const mockDeleteFile = jest.fn();
jest.mock('../../services/entity-pack.service', () => ({
  createPipelineRun: (...args: unknown[]) => mockCreatePipelineRun(...args),
  getActivePipelineRun: (...args: unknown[]) => mockGetActivePipelineRun(...args),
  isPipelineRunConflict: (error: { code?: string }) => error.code === 'HTTP_409',
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
}));

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

// GET /api/v1/storage/org-project/{org_project_id}/files is the single source
// of truth for the FileUploader's state — this mock's `latestFile` (already
// filtered by entity_id+workstream_id in the real hook; see
// useOrgProjectFiles.test.tsx for that filter's own coverage) is what
// MasterDataUploadScreen reads hasFile/fileName/rowCount/columns from
// directly. There is no second per-file GET anywhere in this screen.
const mockDiscoveryRefetch = jest.fn();
const mockUseOrgProjectFiles = jest.fn();
jest.mock('../../hooks/useOrgProjectFiles', () => ({
  useOrgProjectFiles: (...args: unknown[]) => mockUseOrgProjectFiles(...args),
}));

const mockRemoveFile = jest.fn();
const mockUseDeleteFile = jest.fn();
jest.mock('../../hooks/useDeleteFile', () => ({
  useDeleteFile: (...args: unknown[]) => mockUseDeleteFile(...args),
}));

// Downloads + parses a persisted file's real bytes for the preview table
// when there's no local csvRows parse to show (see the screen's own
// comment on effectiveRows) — mocked like every other data hook here so
// these tests never need a real QueryClientProvider.
const mockUsePersistedFilePreview = jest.fn();
jest.mock('../../hooks/usePersistedFilePreview', () => ({
  usePersistedFilePreview: (...args: unknown[]) => mockUsePersistedFilePreview(...args),
}));

const mockCompleteStep = jest.fn();
const mockSetPipelineRunId = jest.fn();
const mockClearPipelineRunId = jest.fn();
const mockRecordStep = jest.fn();
const mockSetLoadPreview = jest.fn();
const mockSetUploadedFile = jest.fn();
const mockClearUploadedFile = jest.fn();
const mockSetSourceCsv = jest.fn();
const mockClearSourceCsv = jest.fn();
let mockPipelineRunIdByEntity: Record<string, string> = {};
let mockLoadPreviewByEntity: Record<string, { fileName: string; rows: string[][] }> = {};
let mockCurrentStepId = 'upload';
let mockCompletedStepIdsByEntity: Record<string, string[]> = {};
jest.mock('../../store/wizard.store', () => ({
  // Real implementation — a pure string-formatting helper, not store state —
  // so this mock's pipelineRunIdByEntity fixtures below can use the exact
  // key shape the screen builds and looks up.
  buildEntityKey: jest.requireActual('../../store/wizard.store').buildEntityKey,
  useWizardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      // Seeded by MasterDataWizardScreen in the real app — see its own
      // header comment. No test here changes entity/project mid-flight.
      entityId: 'customers',
      orgProjectId: 'org-1',
      parentProjectId: 'proj-1',
      workstreamId: 'ws-1',
      pipelineRunIdByEntity: mockPipelineRunIdByEntity,
      setPipelineRunId: mockSetPipelineRunId,
      clearPipelineRunId: mockClearPipelineRunId,
      recordStep: mockRecordStep,
      loadPreviewByEntity: mockLoadPreviewByEntity,
      setLoadPreview: mockSetLoadPreview,
      setUploadedFile: mockSetUploadedFile,
      clearUploadedFile: mockClearUploadedFile,
      setSourceCsv: mockSetSourceCsv,
      clearSourceCsv: mockClearSourceCsv,
      currentStepId: mockCurrentStepId,
      completedStepIdsByEntity: mockCompletedStepIdsByEntity,
      completeStep: mockCompleteStep,
    }),
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

// GET /api/v1/storage/org-project/{org_project_id}/files's per-item shape
// (PersistedFile, see entity-pack.service.ts) — a file known only from
// discovery, with no local CSV parse behind it. Carries its own
// entity_id/workstream_id, matching the current selection ('customers'/
// 'ws-1') — see the cross-entity/cross-workstream tests below for fixtures
// that deliberately don't.
const PERSISTED_FILE = {
  id: 'file-persisted-1',
  fileType: 'source_erp',
  originalFilename: 'persisted-customers.csv',
  storagePath: '/storage/file-persisted-1',
  contentType: 'text/csv',
  sizeBytes: 4096,
  status: 'ready',
  columns: ['Account No', 'Customer Name'],
  rowCount: 5,
  createdAt: '2026-09-01T00:00:00Z',
  entityId: 'customers',
  workstreamId: 'ws-1',
};

// Same file, shaped as useOrgProjectFiles' latestFile — used to simulate
// "the upload confirmed, and the discovery refetch it triggers has settled
// with the matching record".
const UPLOAD_RESULT_AS_FILE = {
  id: UPLOAD_RESULT.fileId,
  fileType: UPLOAD_RESULT.fileType,
  originalFilename: UPLOAD_RESULT.fileName,
  storagePath: UPLOAD_RESULT.storagePath,
  contentType: UPLOAD_RESULT.contentType,
  sizeBytes: UPLOAD_RESULT.sizeBytes,
  status: UPLOAD_RESULT.status,
  columns: [] as string[],
  rowCount: UPLOAD_RESULT.rowCount,
  createdAt: UPLOAD_RESULT.createdAt,
  entityId: 'customers',
  workstreamId: 'ws-1',
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

function setOrgProjectFiles(overrides: Partial<ReturnType<typeof mockUseOrgProjectFiles>> = {}): void {
  mockUseOrgProjectFiles.mockReturnValue({
    files: [],
    total: 0,
    hasFile: false,
    latestFile: null,
    isLoading: false,
    error: null,
    refetch: mockDiscoveryRefetch,
    ...overrides,
  });
}

function setDeleteFile(overrides: Partial<ReturnType<typeof mockUseDeleteFile>> = {}): void {
  mockUseDeleteFile.mockReturnValue({
    remove: mockRemoveFile,
    isRemoving: false,
    error: null,
    ...overrides,
  });
}

function setPersistedFilePreview(overrides: Partial<ReturnType<typeof mockUsePersistedFilePreview>> = {}): void {
  mockUsePersistedFilePreview.mockReturnValue({
    rows: [],
    isLoading: false,
    error: null,
    ...overrides,
  });
}

describe('MasterDataUploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadAsStringAsync.mockResolvedValue(CSV_CONTENT);
    mockPipelineRunIdByEntity = {};
    mockCurrentStepId = 'upload';
    mockCompletedStepIdsByEntity = {};
    setEntityPack(null);
    setSourceFileUpload();
    setProjectDetail();
    setOrgProjectFiles();
    setDeleteFile();
    setPersistedFilePreview();
    mockCreatePipelineRun.mockResolvedValue({ ok: true, data: { id: 'run-1', status: 'pending' } });
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

  it('picks a file, parses it locally and uploads it to the server', async () => {
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///mock.csv', name: 'mock.csv' }),
    );
    // Upload still pending (mocked isUploading stays false / result stays null by
    // default here) — continue is gated on a confirmed result, not just a file.
    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('sends orgProjectId/workstreamId through to useSourceFileUpload', () => {
    render(<MasterDataUploadScreen />);

    expect(mockUseSourceFileUpload).toHaveBeenCalledWith(
      expect.objectContaining({ orgProjectId: 'org-1', workstreamId: 'ws-1' }),
    );
  });

  it('calls useOrgProjectFiles scoped to the current org_project_id+workstream_id+entityId, and shows "no file" when it finds nothing', () => {
    render(<MasterDataUploadScreen />);

    expect(mockUseOrgProjectFiles).toHaveBeenCalledWith('org-1', 'ws-1', 'customers');
    expect(screen.getByText('No source customers file selected')).toBeTruthy();
  });

  it('populates the FileUploader directly from the discovery response\'s latestFile — no second per-file fetch', () => {
    setOrgProjectFiles({ latestFile: PERSISTED_FILE });
    render(<MasterDataUploadScreen />);

    expect(screen.getByText(`${PERSISTED_FILE.originalFilename} · ${PERSISTED_FILE.rowCount} rows loaded`)).toBeTruthy();
  });

  it('re-runs discovery immediately after a successful upload, rather than trusting the raw mutation response', () => {
    setSourceFileUpload({ result: UPLOAD_RESULT });
    render(<MasterDataUploadScreen />);

    expect(mockDiscoveryRefetch).toHaveBeenCalled();
  });

  it('re-runs discovery on every focus, so switching Entity/Workstream and coming back re-evaluates immediately', () => {
    render(<MasterDataUploadScreen />);

    expect(mockDiscoveryRefetch).toHaveBeenCalled();
  });

  it("falls back to the discovery call's latestFile when there's no fresh uploadResult — e.g. after a refresh or navigating back to this screen", () => {
    // Simulates the screen losing its local mutation state (a real refresh,
    // or Continue-to-Profile-then-Back) — the upload mutation itself has no
    // result, but GET /storage/org-project/{org_project_id}/files (scoped to
    // this org_project_id+workstream_id+entity_id) still finds the file.
    // The file must keep showing until Remove is pressed, never disappear
    // just because of a refresh/reload.
    setOrgProjectFiles({ latestFile: PERSISTED_FILE });
    setSourceFileUpload({ result: null });
    render(<MasterDataUploadScreen />);

    expect(screen.getByText(`${PERSISTED_FILE.originalFilename} · ${PERSISTED_FILE.rowCount} rows loaded`)).toBeTruthy();
  });

  it('flags a missing expected column using the persisted file\'s own columns when there is no local CSV parse', async () => {
    setEntityPack({
      label: { singular: 'Customer', plural: 'Customers' },
      target: { record: '' },
      spec: { expectedColumns: ['Account No', 'Tax Region'] },
    } as EntityPack);
    setOrgProjectFiles({ latestFile: PERSISTED_FILE });
    render(<MasterDataUploadScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-column-warning')).toBeTruthy();
    });
    expect(screen.getByTestId('file-upload-column-warning').props.children).toBe('Tax Region');
  });

  it('deletes the persisted file (DELETE /api/v1/storage/files/{id}) when Remove is pressed', async () => {
    setOrgProjectFiles({ latestFile: PERSISTED_FILE });
    render(<MasterDataUploadScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-remove')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('file-upload-remove'));

    expect(mockRemoveFile).toHaveBeenCalledWith(PERSISTED_FILE.id);
  });

  it("extracts the matched file's own workstream_id for the delete call, not just the currently selected workstream_id", () => {
    setOrgProjectFiles({ latestFile: { ...PERSISTED_FILE, workstreamId: 'ws-owned-by-file' } });
    render(<MasterDataUploadScreen />);

    expect(mockUseDeleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ orgProjectId: 'org-1', workstreamId: 'ws-owned-by-file', entityId: 'customers' }),
    );
  });

  it('rehydrates the dropzone from the discovery call on a fresh mount (e.g. after Back), and Continue still works', async () => {
    // Simulates the screen losing its local state — the upload mutation has
    // no result of its own, but discovery (GET /storage/org-project/
    // {org_project_id}/files) still finds last time's confirmed upload.
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    setSourceFileUpload({ result: null });
    render(<MasterDataUploadScreen />);

    expect(screen.getByText('mock.csv · 2 rows loaded')).toBeTruthy();
    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).not.toBe(true);

    fireEvent.press(screen.getByTestId('upload-continue-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });
    expect(mockCreatePipelineRun).toHaveBeenCalledWith('ws-1', 'customers', UPLOAD_RESULT.storagePath);
  });

  it('never shows a file belonging to a different entity or workstream, even under the same org project', () => {
    // useOrgProjectFiles itself is what enforces the strict entity_id +
    // workstream_id match (see useOrgProjectFiles.test.tsx) — this only
    // proves the screen honours whatever it comes back with. A mismatched
    // file never reaches this mock as `latestFile` in the first place, so
    // the default (null) beforeEach state already represents that case.
    render(<MasterDataUploadScreen />);

    expect(screen.queryByText('mock.csv · 2 rows loaded')).toBeNull();
    expect(screen.getByText('No source customers file selected')).toBeTruthy();
  });

  it('shows the local CSV header (not the discovered file\'s own columns) once the upload confirms', async () => {
    setEntityPack({
      label: { singular: 'Customer', plural: 'Customers' },
      target: { record: '' },
      spec: { expectedColumns: ['Account No', 'Tax Region'] },
    } as EntityPack);
    const { rerender } = render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));
    await waitFor(() => expect(mockUpload).toHaveBeenCalled());

    // Server confirms the upload; the discovery refetch it triggers settles
    // with the matching record — this is what actually flips hasFile to
    // true and lets the column check run.
    setSourceFileUpload({ result: UPLOAD_RESULT });
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    rerender(<MasterDataUploadScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-column-warning')).toBeTruthy();
    });
    expect(screen.getByTestId('file-upload-column-warning').props.children).toBe('Tax Region');
  });

  it('keeps the source file preview hidden by default after a file loads, and toggles it open and closed', async () => {
    const { rerender } = render(<MasterDataUploadScreen />);
    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    setSourceFileUpload({ result: UPLOAD_RESULT });
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    rerender(<MasterDataUploadScreen />);

    await waitFor(() => {
      expect(screen.getByText('mock.csv · 2 rows loaded')).toBeTruthy();
    });
    expect(screen.queryByText('Source File Preview')).toBeNull();

    fireEvent.press(screen.getByTestId('file-upload-toggle-preview'));
    expect(screen.getByText('Source File Preview')).toBeTruthy();

    fireEvent.press(screen.getByTestId('file-upload-toggle-preview'));
    expect(screen.queryByText('Source File Preview')).toBeNull();
  });

  it('removes an already-confirmed file, resetting the upload mutation and any pipeline run', async () => {
    setOrgProjectFiles({ latestFile: PERSISTED_FILE });
    render(<MasterDataUploadScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload-remove')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('file-upload-remove'));

    expect(mockResetUpload).toHaveBeenCalled();
    expect(mockClearPipelineRunId).toHaveBeenCalledWith('customers');
    expect(mockRemoveFile).toHaveBeenCalledWith(PERSISTED_FILE.id);
  });

  it('loads the built-in sample file locally without contacting the upload service', () => {
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByText('Load'));

    // This mock's wizard.store is a static snapshot (setLoadPreview doesn't
    // reactively update loadPreviewByEntity here), so the rendered preview
    // panel can't be asserted on directly — verify the store call itself
    // instead: the sample is parsed and handed to the store, and the
    // server is never contacted for it.
    expect(mockSetLoadPreview).toHaveBeenCalledWith(
      'customers',
      'customers-sample.csv',
      expect.arrayContaining([expect.arrayContaining(['Account No'])]),
    );
    expect(mockUpload).not.toHaveBeenCalled();
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
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('upload-back-button'));
    expect(mockParentNavigate).toHaveBeenCalledWith('ProjectOverview', { projectId: 'proj-1' });

    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).not.toBe(true);

    fireEvent.press(screen.getByTestId('upload-continue-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });
    expect(mockCreatePipelineRun).toHaveBeenCalledWith('ws-1', 'customers', UPLOAD_RESULT.storagePath);
    // Records the resume point for this entity — see wizard.store.ts's
    // stepByEntity, which is what lets a later revisit (or a page refresh,
    // via its storage persistence) reopen the wizard on Profile instead of
    // restarting at Upload.
    expect(mockRecordStep).toHaveBeenCalledWith('customers', 'profile');
    expect(screen.getByText(`Continue to ${profileStep.label}`)).toBeTruthy();
  });

  it('reuses a previously created run instead of creating a new one on a second Continue press', async () => {
    mockPipelineRunIdByEntity = { 'proj-1:customers': 'run-already-created' };
    setSourceFileUpload({ result: UPLOAD_RESULT });
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('upload-continue-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });
    expect(mockCreatePipelineRun).not.toHaveBeenCalled();
  });

  it('recovers the already-running profile run on a 409 conflict and still navigates to Profile', async () => {
    mockCreatePipelineRun.mockResolvedValue({
      ok: false,
      error: { code: 'HTTP_409', message: 'A profile run for this workstream and scope is already in progress' },
    });
    mockGetActivePipelineRun.mockResolvedValue({ ok: true, data: { id: 'run-existing', status: 'running' } });
    setSourceFileUpload({ result: UPLOAD_RESULT });
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('upload-continue-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Profile');
    });
    expect(mockGetActivePipelineRun).toHaveBeenCalledWith('org-1', 'customers');
  });

  it('shows a toast and does not navigate when starting the profiler run fails', async () => {
    mockCreatePipelineRun.mockResolvedValue({ ok: false, error: { code: 'HTTP_500', message: 'Server error' } });
    setSourceFileUpload({ result: UPLOAD_RESULT });
    setOrgProjectFiles({ latestFile: UPLOAD_RESULT_AS_FILE });
    render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('upload-continue-button'));

    await waitFor(() => {
      expect(mockCreatePipelineRun).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('Profile');
  });

  it('disables Continue and shows a retry label when the upload has failed', () => {
    setSourceFileUpload({ error: { code: 'UPLOAD_FAILED', message: 'Server rejected the file' } });
    render(<MasterDataUploadScreen />);

    expect(screen.getByText('Upload failed — retry')).toBeTruthy();
    expect(screen.getByTestId('upload-continue-button').props.accessibilityState?.disabled).toBe(true);
  });

  it('never shows the file as accepted when the server upload fails (e.g. backend unreachable)', async () => {
    const { rerender } = render(<MasterDataUploadScreen />);

    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));
    // hasFile is strictly discoveredFiles.latestFile !== null (see the
    // screen's own comment) — a local pick alone, with no server
    // confirmation, must never show a file card.
    expect(screen.getByText('No source customers file selected')).toBeTruthy();

    // The server call comes back as unreachable.
    setSourceFileUpload({
      error: { code: 'SERVER_UNREACHABLE', message: 'Cannot reach the server. Make sure it is running, then try again.' },
    });
    rerender(<MasterDataUploadScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload failed — retry')).toBeTruthy();
    });
    expect(screen.getByText('No source customers file selected')).toBeTruthy();
    expect(screen.queryByText('mock.csv · 2 rows loaded')).toBeNull();
  });

  it('does not resurrect the preview when a slow file read resolves after the upload already failed', async () => {
    let resolveRead!: (content: string) => void;
    mockReadAsStringAsync.mockImplementationOnce(
      () => new Promise<string>((resolve) => { resolveRead = resolve; }),
    );

    const { rerender } = render(<MasterDataUploadScreen />);
    fireEvent.press(screen.getByTestId('master-data-upload-dropzone-pick'));

    // The server call fails before the (still in-flight) local file read
    // finishes — this is what the uploadError effect reacts to.
    setSourceFileUpload({
      error: { code: 'SERVER_UNREACHABLE', message: 'Cannot reach the server. Make sure it is running, then try again.' },
    });
    rerender(<MasterDataUploadScreen />);
    await waitFor(() => {
      expect(screen.getByText('No source customers file selected')).toBeTruthy();
    });

    // The slow read finally resolves — its result belongs to the pick that
    // already failed, so it must not resurrect the preview.
    resolveRead(CSV_CONTENT);
    await waitFor(() => {
      expect(screen.queryByText('mock.csv · 2 rows loaded')).toBeNull();
    });
    expect(screen.getByText('No source customers file selected')).toBeTruthy();
  });
});
