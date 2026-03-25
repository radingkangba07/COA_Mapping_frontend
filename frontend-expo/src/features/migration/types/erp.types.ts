// Re-export shared ERP domain types from erp-config (canonical source)
export type { ERPSystem, ERPField } from '@/features/erp-config/types/erp-config.types';

// ─── Migration-Specific ERP Types ───────────────────────────────────────────

/**
 * Extends ERPField with validation constraints used during migration mapping.
 */
export interface ERPFieldSchema {
  readonly id: string;
  readonly name: string;
  readonly type: 'string' | 'number';
  readonly required: boolean;
  readonly pattern?: string | undefined;
  readonly minLength?: number | undefined;
  readonly maxLength?: number | undefined;
}

/**
 * Adapter interface for ERP-specific row mapping and schema retrieval.
 * Each supported ERP implements this interface in its own mapper file.
 * Registered in config/erp-registry.ts — never modify existing adapters for new ERPs.
 */
export interface ERPAdapter {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly ERPFieldSchema[];
  mapSourceRow(row: Record<string, unknown>): Record<string, unknown>;
  mapTargetRow(row: Record<string, unknown>): Record<string, unknown>;
  getAccountTypes(): readonly string[];
}
