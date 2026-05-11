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
  readonly id?: string | undefined;
  readonly suggestion_id?: string | undefined;
  readonly source_number: string;
  readonly source_name: string;
  readonly target_number?: string | null | undefined;
  readonly target_name: string;
  readonly score: number;
  readonly remark: string;
  readonly mapping_source?: string | null | undefined;
  // Raw value of the backend's `mapping_status` DB column. Preserves the
  // original string (e.g. 'suggested', 'pending', 'confirmed',
  // 'auto_matched', 'user_edited', …) without normalisation so the UI can
  // display it verbatim. Use `status` below when you only care about the
  // normalised pending/confirmed distinction.
  readonly mapping_status?: string | undefined;
  readonly status?: 'pending' | 'confirmed' | undefined;
  readonly user_changed?: boolean | undefined;
  readonly changed_by_name?: string | undefined;
  readonly changed_at?: string | undefined;
  // Absent/true = active. `false` = tombstoned locally; row is sent to
  // bulk-save with is_active:false on the next Save.
  readonly is_active?: boolean | undefined;
}

export interface GroupedMapping {
  readonly source_type: string;
  readonly target_type: string;
  readonly confidence: number;
  readonly accounts: readonly AccountMapping[];
}

// ─── API Response Types ────────────────────────────────────────────────────

export interface HierarchicalMappingResponse {
  readonly job_id: string;
  readonly project_id: string;
  readonly status: string;
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

/**
 * Upsert payload row for POST /api/v1/mappings/project/{projectId}.
 * Backend uses exclude_unset semantics — every included field overwrites.
 *
 * - With `id`: UPDATE — only changed fields should be present
 * - With `suggestion_id` only: INSERT + auto-link, `source_account_name` required
 * - With neither: brand-new manual row, `source_account_name` required
 */
export interface MappingCreateDTO {
  readonly id?: string | undefined;
  readonly suggestion_id?: string;
  readonly project_id: string;
  readonly source_account_name?: string | undefined;
  readonly source_account_number?: string | undefined;
  readonly target_account_name?: string | undefined;
  readonly confidence_score?: number | undefined;
  readonly mapping_status?: string | undefined;
  readonly mapping_source?: string | undefined;
  readonly source_account_type?: string | undefined;
  readonly target_account_type?: string | undefined;
  // Only set on deletes. Omit for edits/confirms — backend defaults to true.
  readonly is_active?: boolean | undefined;
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
  readonly project_id: string;
  readonly source_file_id: string;
  readonly target_file_id: string;
  readonly mapping_file_id?: string | undefined;
  readonly account_type_mapping_file_id?: string | undefined;
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
  readonly success: boolean;
  readonly mapping_count: number;
  readonly project_id: string;
  readonly inserted: number;
  readonly updated: number;
}
