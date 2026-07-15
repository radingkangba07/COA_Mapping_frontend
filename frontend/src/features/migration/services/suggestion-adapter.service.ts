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
  // Backend mapping_status values ('approved') mean the same thing as the
  // legacy FE-only 'confirmed' string emitted by the bulk-status endpoint —
  // both must render as confirmed in the UI.
  if (status === 'confirmed' || status === 'approved') return 'confirmed';
  if (status === 'pending' || status === 'suggested') return 'pending';
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
    source_number: account.sourceNumber,
    source_name: account.sourceName,
    target_number: account.targetNumber,
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
 *   account.sourceNumber -> source_number
 *   account.sourceName -> source_name
 *   account.targetName -> target_name
 *   account.score     -> score
 *   account.mappingSource (nullable) -> remark ('' when absent)
 *   account.mappingSource (nullable) -> mapping_source (passthrough)
 *   account.status (raw string) -> mapping_status (undefined when empty)
 *   account.status ('pending'|'confirmed') -> status (other values dropped)
 *
 * `source_number` is empty when the suggestions endpoint omits
 * `source_account_number`. Group order is preserved.
 */
export function adaptSuggestionsToGroupedMappings(
  groups: readonly SuggestionGroup[],
): GroupedMapping[] {
  return groups.map(toGroupedMapping);
}
