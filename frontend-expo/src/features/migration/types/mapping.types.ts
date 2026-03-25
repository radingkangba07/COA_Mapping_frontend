// ─── Value Objects ──────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';
// Note: shared/constants/mapping-confidence.ts exports an uppercase variant (HIGH/MEDIUM/LOW).
// This lowercase variant is used in the store for user-facing filter state.

export interface ConfidenceScore {
  readonly score: number;
  readonly level: ConfidenceLevel;
}

// ─── Domain Entities (snake_case — matches API response shape) ──────────────

export interface AccountMapping {
  source_number: string;
  source_name: string;
  target_name: string;
  score: number;
  remark: string;
  user_changed?: boolean | undefined;
  changed_by_name?: string | undefined;
  changed_at?: string | undefined;
}

export interface GroupedMapping {
  source_type: string;
  target_type: string;
  confidence: number;
  accounts: AccountMapping[];
}

// ─── API Response Types ────────────────────────────────────────────────────

export interface HierarchicalMappingResponse {
  readonly type_column: string | null;
  readonly name_column: string | null;
  readonly number_column: string | null;
  readonly target_types: readonly string[];
  readonly grouped_mappings: readonly GroupedMapping[];
  readonly total_accounts: number;
  readonly total_types: number;
}

// ─── Field Mapping ─────────────────────────────────────────────────────────

export interface FieldMapping {
  readonly sourceField: string;
  readonly targetField: string;
  readonly confidence: number;
}

export interface MappingRule {
  readonly id: string;
  readonly sourcePattern: string;
  readonly targetValue: string;
  readonly isAutomatic: boolean;
}

// ─── DTO Contracts (mutations) ─────────────────────────────────────────────

export interface MappingCreateDTO {
  readonly project_id: string;
  readonly source_account_name: string;
  readonly target_account_name?: string | undefined;
  readonly confidence_score?: number | undefined;
  readonly status?: string | undefined;
  readonly source_type?: string | undefined;
  readonly target_type?: string | undefined;
}

export interface MappingUpdateDTO {
  readonly target_account_name?: string | undefined;
  readonly confidence_score?: number | undefined;
  readonly status?: string | undefined;
}

export interface MappingBulkUpdateDTO {
  readonly mapping_ids: string[];
  readonly update: MappingUpdateDTO;
}

export interface HierarchicalMappingRequestDTO {
  readonly source_data: Record<string, unknown>[];
  readonly target_data?: Record<string, unknown>[] | undefined;
  readonly source_erp?: string | undefined;
  readonly target_erp?: string | undefined;
}
