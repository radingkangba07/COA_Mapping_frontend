import {
  MASTER_DATA_ITEMS,
  OPENING_BALANCE_ITEMS,
} from '@/features/projects/components/MigrationScope.config';
import type { WorkstreamGroupModel } from '../types/project-overview.types';
import type { Workstream } from '../types/workstream.types';

// Full canonical item list per category slug.
// Drives the "Not Included" greyed-out rows shown for items not selected during
// project creation.
const CANONICAL_BY_CATEGORY: Record<
  string,
  readonly { readonly id: string; readonly label: string }[]
> = {
  master_data: MASTER_DATA_ITEMS,
  opening_balances: OPENING_BALANCE_ITEMS,
};

// Both scope sections must always render on the overview, even when a category
// has no workstreams at all — the backend only returns groups that have rows.
const CANONICAL_GROUPS: readonly { readonly key: string; readonly title: string }[] = [
  { key: 'master_data', title: 'Master Data' },
  { key: 'opening_balances', title: 'Opening Balances' },
];

function toNotIncludedRow(item: {
  readonly id: string;
  readonly label: string;
}): Workstream {
  return {
    id: `not-included-${item.id}`,
    name: item.label,
    projectId: '—',
    status: 'not_included',
    progress: 0,
    currentStage: '—',
    included: false,
  };
}

export function augmentNotIncluded(
  groups: readonly WorkstreamGroupModel[],
): readonly WorkstreamGroupModel[] {
  const augmented = groups.map((group) => {
    const canonical = CANONICAL_BY_CATEGORY[group.key];
    if (canonical === undefined) return group;

    const includedNames = new Set(group.items.map((w) => w.name.toLowerCase()));

    const notIncludedRows: readonly Workstream[] = canonical
      .filter((item) => !includedNames.has(item.label.toLowerCase()))
      .map(toNotIncludedRow);

    if (notIncludedRows.length === 0) return group;

    return { ...group, items: [...group.items, ...notIncludedRows] };
  });

  // Synthesize any canonical section the backend omitted, so e.g. a project
  // with zero opening balances still shows that section fully greyed out.
  // Returned groups keep their order; missing ones append in canonical order.
  const presentKeys = new Set(augmented.map((group) => group.key));
  const synthesized = CANONICAL_GROUPS.filter(
    (canonical) => !presentKeys.has(canonical.key),
  ).map(
    (canonical): WorkstreamGroupModel => ({
      key: canonical.key,
      title: canonical.title,
      items: (CANONICAL_BY_CATEGORY[canonical.key] ?? []).map(toNotIncludedRow),
    }),
  );

  return [...augmented, ...synthesized];
}
