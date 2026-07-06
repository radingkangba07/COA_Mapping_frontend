import type { AccountMapping } from '@/features/migration/types/mapping.types';

// ─── Selection Key ───────────────────────────────────────────────────────────

// Stable identity across index shifts, collapses, and confidence-filter changes.
// Components MUST use this helper — never construct the key inline.
export function selectionKey(sourceType: string, account: AccountMapping): string {
  return `${sourceType}::${account.source_number ?? ''}::${account.source_name}`;
}

// ─── Tri-state Helper ────────────────────────────────────────────────────────

export function computeTriState(
  selection: Record<string, true>,
  visibleKeys: string[],
): boolean | 'indeterminate' {
  if (visibleKeys.length === 0) return false;
  const selectedCount = visibleKeys.filter((k) => selection[k] === true).length;
  if (selectedCount === 0) return false;
  if (selectedCount === visibleKeys.length) return true;
  return 'indeterminate';
}
