import type {
  AccountMapping,
  GroupedMapping,
} from '@/features/migration/types/mapping.types';
import type {
  SuggestionAccount,
  SuggestionGroup,
} from '@/features/migration/types/suggestion.types';

// ─── Status Mapping ────────────────────────────────────────────────────────

function normalizeStatus(status: string): AccountMapping['status'] {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'pending') return 'pending';
  return undefined;
}

// ─── Account Adapter ───────────────────────────────────────────────────────

function toAccountMapping(account: SuggestionAccount): AccountMapping {
  // Preserve the raw backend status string as `mapping_status` for UI
  // display (e.g. the Remark column). `status` keeps the stricter
  // pending/confirmed-only normalisation used by hydration/business logic.
  const rawStatus = account.status.length > 0 ? account.status : undefined;
  const base: AccountMapping = {
    id: account.id || undefined,
    suggestion_id: account.suggestionId,
    source_number: '',
    source_name: account.sourceName,
    target_name: account.targetName,
    score: account.score,
    remark: account.mappingSource ?? '',
    mapping_source: account.mappingSource,
    ...(rawStatus !== undefined ? { mapping_status: rawStatus } : {}),
  };
  const status = normalizeStatus(account.status);
  if (status === undefined) {
    return base;
  }
  return { ...base, status };
}

// ─── Group Adapter ─────────────────────────────────────────────────────────

function toGroupedMapping(group: SuggestionGroup): GroupedMapping {
  return {
    source_type: group.sourceType,
    target_type: group.targetType,
    confidence: group.confidence,
    accounts: group.accounts.map(toAccountMapping),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Transform `SuggestionGroup[]` (camelCase domain from the
 * `/api/v1/mappings/project/{id}/suggestions` endpoint) into the
 * `GroupedMapping[]` shape the existing ValidationScreen UI consumes.
 *
 * Field mapping:
 *   sourceType        -> source_type
 *   targetType        -> target_type
 *   confidence        -> confidence
 *   account.sourceName -> source_name
 *   account.targetName -> target_name
 *   account.score     -> score
 *   account.mappingSource (nullable) -> remark ('' when absent)
 *   account.mappingSource (nullable) -> mapping_source (passthrough)
 *   account.status (raw string) -> mapping_status (undefined when empty)
 *   account.status ('pending'|'confirmed') -> status (other values dropped)
 *
 * `source_number` is not provided by the suggestions endpoint, so it is
 * left as an empty string. Group order is preserved.
 */
export function adaptSuggestionsToGroupedMappings(
  groups: readonly SuggestionGroup[],
): GroupedMapping[] {
  return groups.map(toGroupedMapping);
}
