import type { HttpClient } from '@/shared/services/http/http.types';
import { toAppError } from '@/shared/services/http/http.client';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type { MappingExportItem, ExportResult } from '@/features/export/types/export.types';
import { generateCSV } from './csv-writer.service';

// ─── Flatten Grouped Mappings ───────────────────────────────────────────────

interface GroupedMappingInput {
  readonly source_type: string;
  readonly target_type: string;
  readonly confidence: number;
  readonly accounts: readonly {
    readonly source_name: string;
    readonly target_name: string;
  }[];
}

export function flattenMappings(groups: readonly GroupedMappingInput[]): MappingExportItem[] {
  const items: MappingExportItem[] = [];
  for (const group of groups) {
    for (const account of group.accounts) {
      items.push({
        source_field: account.source_name,
        target_field: account.target_name,
        source_type: group.source_type,
        target_type: group.target_type,
        confidence: group.confidence,
        method: 'hierarchical',
      });
    }
  }
  return items;
}

// ─── Export Mappings (Excel) ────────────────────────────────────────────────

/**
 * POST mappings to the export endpoint and receive an Excel blob.
 * Ported from App.js handleExport (lines 1560-1607).
 */
export async function exportMappings(
  client: HttpClient,
  projectId: string,
  items: readonly MappingExportItem[],
): Promise<Result<ExportResult, AppError>> {
  try {
    const response = await client.post<ArrayBuffer>(
      `/api/v1/mappings/project/${projectId}/export`,
      { mappings: items },
      { responseType: 'blob' },
    );

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const filename = `mapped_coa_${projectId}.xlsx`;

    return ok({ blob, filename, format: 'excel' as const });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// ─── Export Mappings (CSV) ──────────────────────────────────────────────────

export function exportMappingsAsCSV(
  items: readonly MappingExportItem[],
  projectId: string,
): Result<ExportResult, AppError> {
  try {
    const csvContent = generateCSV(items);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const filename = `mapped_coa_${projectId}.csv`;
    return ok({ blob, filename, format: 'csv' as const });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
