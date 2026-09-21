import type { AccountMapping } from '@/features/migration/types/mapping.types';

// ─── Remark Text ─────────────────────────────────────────────────────────────

// Local edits set user_changed:true optimistically. After Save + refetch,
// that flag is gone but the backend returns mapping_source:"user".
export function isUserChanged(account: AccountMapping): boolean {
  return account.user_changed === true || account.mapping_source === 'user';
}

export function getRemarkText(account: AccountMapping): string {
  if (isUserChanged(account)) {
    return 'Changed by User';
  }
  if (account.score >= 70) return 'AI suggestion';
  // Show the backend's raw mapping_status DB column when available, so the
  // Remark reflects the persisted status value rather than a static label.
  // Falls back to the original label when the column is unset.
  const status = account.mapping_status?.trim();
  return status !== undefined && status.length > 0 ? status : 'Account Name Mapping';
}
