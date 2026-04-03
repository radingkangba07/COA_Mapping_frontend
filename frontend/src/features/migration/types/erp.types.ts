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

