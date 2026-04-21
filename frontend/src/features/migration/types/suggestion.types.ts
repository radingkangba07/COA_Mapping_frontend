// ─── Wire Shape (snake_case — matches API response) ────────────────────────

export interface SuggestionAccountDTO {
  readonly id: string | null;
  readonly suggestion_id: string;
  readonly source_name: string;
  readonly target_name: string;
  readonly score: number;
  readonly status: string;
  readonly mapping_source?: string | null | undefined;
}

export interface SuggestionGroupDTO {
  readonly source_type: string;
  readonly target_type: string;
  readonly confidence: number;
  readonly accounts: readonly SuggestionAccountDTO[];
}

export interface SuggestionListResponseDTO {
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
  readonly groups: readonly SuggestionGroupDTO[];
}

// ─── Domain Shape ──────────────────────────────────────────────────────────

export interface SuggestionAccount {
  readonly id: string | null;
  readonly suggestionId: string;
  readonly sourceName: string;
  readonly targetName: string;
  readonly score: number;
  readonly status: string;
  readonly mappingSource: string | null;
}

export interface SuggestionGroup {
  readonly sourceType: string;
  readonly targetType: string;
  readonly confidence: number;
  readonly accounts: readonly SuggestionAccount[];
}

export interface SuggestionListResponse {
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
  readonly groups: readonly SuggestionGroup[];
}

// ─── Query Options ─────────────────────────────────────────────────────────

export interface SuggestionQueryOptions {
  readonly status?: string;
  readonly sourceType?: string;
  readonly skip?: number;
  readonly limit?: number;
}
