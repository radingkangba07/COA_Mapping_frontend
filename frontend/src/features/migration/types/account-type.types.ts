// DTO contracts mirroring the backend account-type-mappings endpoints.
// Field names follow the backend's snake_case. Domain code uses the
// grouped TypeMappingRow shape from migration.types.ts.

export interface AccountTypeMappingPairDTO {
  readonly source_account_type: string;
  readonly target_account_type: string;
}

export interface AccountTypeMappingBulkRequestDTO {
  readonly type_mappings: readonly AccountTypeMappingPairDTO[];
  readonly mapping_file_id?: string;
}

export interface AccountTypeMappingBulkResponseDTO {
  readonly success: boolean;
  readonly count: number;
  readonly project_id: string;
}

export interface AccountTypeMappingResponseDTO {
  readonly id: string;
  readonly project_id: string;
  readonly mapping_file_id?: string | null;
  readonly source_account_type: string;
  readonly target_account_type: string;
  readonly is_active: boolean;
  readonly created_by?: string | null;
  readonly updated_by?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
