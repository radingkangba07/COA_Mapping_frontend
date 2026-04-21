import { renderHook, act } from '@testing-library/react-native';
import { useExportViewModel } from '../useExportViewModel';
import { useExportStore } from '@/features/export/store/export.store';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

const mockExportMappings = jest.fn();
const mockExportMappingsAsCSV = jest.fn();
const mockFlattenMappings = jest.fn().mockReturnValue([]);
jest.mock('@/features/export/services/export.service', () => ({
  exportMappings: (...args: unknown[]) => mockExportMappings(...args),
  exportMappingsAsCSV: (...args: unknown[]) => mockExportMappingsAsCSV(...args),
  flattenMappings: (...args: unknown[]) => mockFlattenMappings(...args),
}));

const mockDownloadBlob = jest.fn();
jest.mock('@/shared/utils/download.utils', () => ({
  downloadBlob: (...args: unknown[]) => mockDownloadBlob(...args),
}));

const mockUpdateProject = jest.fn();
jest.mock('@/features/projects/services/projects.service', () => ({
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockGroupedMappings = [
  {
    source_type: 'Asset',
    target_type: 'Assets',
    confidence: 95,
    accounts: [{ source_name: 'Cash', target_name: 'Cash & Bank' }],
  },
];

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useExportViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useExportStore.getState().reset();
  });

  it('performExport downloads without calling updateProject', async () => {
    mockExportMappingsAsCSV.mockReturnValue({
      ok: true,
      data: { blob: new Blob(['test']), filename: 'test.csv', format: 'csv' },
    });
    mockDownloadBlob.mockResolvedValue({ ok: true });

    useExportStore.getState().setFormat('csv');

    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: 'proj-1' }),
    );

    let success = false;
    await act(async () => {
      success = await result.current.performExport();
    });

    expect(success).toBe(true);
    expect(mockUpdateProject).not.toHaveBeenCalled();
    expect(mockShowSuccess).toHaveBeenCalledWith('Export completed successfully!');
  });

  it('performExport returns false and skips download when export fails', async () => {
    mockExportMappingsAsCSV.mockReturnValue({
      ok: false,
      error: { code: 'EXPORT_FAILED', message: 'Export failed' },
    });

    useExportStore.getState().setFormat('csv');

    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: 'proj-1' }),
    );

    let success = false;
    await act(async () => {
      success = await result.current.performExport();
    });

    expect(success).toBe(false);
    expect(mockDownloadBlob).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });

  it('performExport returns false when download fails', async () => {
    mockExportMappingsAsCSV.mockReturnValue({
      ok: true,
      data: { blob: new Blob(['test']), filename: 'test.csv', format: 'csv' },
    });
    mockDownloadBlob.mockResolvedValue({
      ok: false,
      error: { code: 'DOWNLOAD_FAILED', message: 'Download failed' },
    });

    useExportStore.getState().setFormat('csv');

    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: 'proj-1' }),
    );

    let success = false;
    await act(async () => {
      success = await result.current.performExport();
    });

    expect(success).toBe(false);
    expect(mockShowError).toHaveBeenCalled();
  });

  it('markComplete calls updateProject with completed status', async () => {
    mockUpdateProject.mockResolvedValue({ ok: true, data: {} });

    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: 'proj-1' }),
    );

    let success = false;
    await act(async () => {
      success = await result.current.markComplete();
    });

    expect(success).toBe(true);
    expect(mockUpdateProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { status: 'completed', currentStep: 5 },
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Migration marked as complete');
  });

  it('markComplete returns false when updateProject fails', async () => {
    mockUpdateProject.mockResolvedValue({
      ok: false,
      error: { code: 'UPDATE_FAILED', message: 'Update failed' },
    });

    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: 'proj-1' }),
    );

    let success = true;
    await act(async () => {
      success = await result.current.markComplete();
    });

    expect(success).toBe(false);
    expect(mockShowError).toHaveBeenCalledWith('Update failed');
  });

  it('markComplete shows error and returns false when projectId is missing', async () => {
    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: null }),
    );

    let success = true;
    await act(async () => {
      success = await result.current.markComplete();
    });

    expect(success).toBe(false);
    expect(mockUpdateProject).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('No project selected');
  });
});
