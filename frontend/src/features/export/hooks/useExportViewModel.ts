import { useCallback } from 'react';
import { useExportStore } from '@/features/export/store/export.store';
import { selectIsExporting, selectExportFormat, selectExportError } from '@/features/export/store/export.selectors';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import type { ExportFormat } from '@/features/export/types/export.types';
import { exportMappings, exportMappingsAsCSV, flattenMappings } from '@/features/export/services/export.service';
import { downloadBlob } from '@/shared/utils/download.utils';
import { isOk } from '@/shared/types/result.types';

// ─── Input Contract ─────────────────────────────────────────────────────────

interface GroupedMappingInput {
  readonly source_type: string;
  readonly target_type: string;
  readonly confidence: number;
  readonly accounts: readonly {
    readonly source_name: string;
    readonly target_name: string;
  }[];
}

interface UseExportViewModelParams {
  readonly groupedMappings: readonly GroupedMappingInput[];
  readonly projectId: string | null;
}

// ─── ViewModel ──────────────────────────────────────────────────────────────

export function useExportViewModel({ groupedMappings, projectId }: UseExportViewModelParams) {
  const isExporting = useExportStore(selectIsExporting);
  const exportFormat = useExportStore(selectExportFormat);
  const error = useExportStore(selectExportError);
  const setExporting = useExportStore((s) => s.setExporting);
  const setFormat = useExportStore((s) => s.setFormat);
  const setError = useExportStore((s) => s.setError);

  const { showSuccess, showError } = useToast();

  const performExport = useCallback(async () => {
    if (!projectId) {
      showError('No project selected');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const items = flattenMappings(groupedMappings);

      const result = exportFormat === 'csv'
        ? exportMappingsAsCSV(items, projectId)
        : await exportMappings(httpClient, projectId, items);

      if (!isOk(result)) {
        setError(result.error);
        showError(result.error.message);
        return;
      }

      const downloadResult = await downloadBlob(result.data.blob, result.data.filename);
      if (!isOk(downloadResult)) {
        setError(downloadResult.error);
        showError(downloadResult.error.message);
        return;
      }

      showSuccess('Export completed successfully!');
    } finally {
      setExporting(false);
    }
  }, [exportFormat, groupedMappings, projectId, setError, setExporting, showError, showSuccess]);

  const changeFormat = useCallback(
    (format: ExportFormat) => {
      setFormat(format);
    },
    [setFormat],
  );

  return {
    performExport,
    changeFormat,
    isExporting,
    exportFormat,
    error,
  };
}
