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

  it('updates project status to completed after successful export', async () => {
    mockExportMappingsAsCSV.mockReturnValue({
      ok: true,
      data: { blob: new Blob(['test']), filename: 'test.csv', format: 'csv' },
    });
    mockDownloadBlob.mockResolvedValue({ ok: true });
    mockUpdateProject.mockResolvedValue({ ok: true, data: {} });

    useExportStore.getState().setFormat('csv');

    const { result } = renderHook(() =>
      useExportViewModel({ groupedMappings: mockGroupedMappings, projectId: 'proj-1' }),
    );

    let success = false;
    await act(async () => {
      success = await result.current.performExport();
    });

    expect(success).toBe(true);
    expect(mockUpdateProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { status: 'completed', currentStep: 5 },
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Export completed successfully!');
  });

  it('does not update project status when export fails', async () => {
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
    expect(mockUpdateProject).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });

  it('does not update project status when download fails', async () => {
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
    expect(mockUpdateProject).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });
});
