import type { MappingExportItem } from '@/features/export/types/export.types';

/**
 * Generates a CSV string from mapping export items.
 * Ported from App.js handleSaveTypeMappingCSV (lines 1379-1397).
 */
export function generateCSV(mappings: readonly MappingExportItem[]): string {
  const header = 'Source Field,Target Field,Source Type,Target Type,Confidence,Method';

  const rows = mappings.map((item) => {
    const fields = [
      escapeCSVField(item.source_field),
      escapeCSVField(item.target_field),
      escapeCSVField(item.source_type),
      escapeCSVField(item.target_type),
      String(item.confidence),
      escapeCSVField(item.method),
    ];
    return fields.join(',');
  });

  return [header, ...rows].join('\n');
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
