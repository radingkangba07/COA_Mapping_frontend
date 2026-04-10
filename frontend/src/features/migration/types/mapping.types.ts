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
  readonly source_number: string;
  readonly source_name: string;
  readonly target_name: string;
  readonly score: number;
  readonly remark: string;
  readonly status?: 'pending' | 'confirmed' | undefined;
  readonly user_changed?: boolean | undefined;
  readonly changed_by_name?: string | undefined;
  readonly changed_at?: string | undefined;
}

export interface GroupedMapping {
  readonly source_type: string;
  readonly target_type: string;
  readonly confidence: number;
  readonly accounts: readonly AccountMapping[];
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
  readonly source_account_number?: string | undefined;
  readonly target_account_name?: string | undefined;
  readonly confidence_score?: number | undefined;
  readonly status?: string | undefined;
  readonly source_account_type?: string | undefined;
  readonly target_account_type?: string | undefined;
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
  readonly source_system?: string | undefined;
  readonly target_system?: string | undefined;
}

export interface MappingResponseDTO {
  readonly id: string;
  readonly project_id: string;
  readonly source_account_name: string;
  readonly target_account_name: string | null;
  readonly confidence_score: number | null;
  readonly status: string;
  readonly source_type: string | null;
  readonly target_type: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface BulkSaveResponseDTO {
  readonly created: number;
  readonly mappings: readonly MappingResponseDTO[];
}
