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

export function augmentNotIncluded(
  groups: readonly WorkstreamGroupModel[],
): readonly WorkstreamGroupModel[] {
  return groups.map((group) => {
    const canonical = CANONICAL_BY_CATEGORY[group.key];
    if (canonical === undefined) return group;

    const includedNames = new Set(group.items.map((w) => w.name.toLowerCase()));

    const notIncludedRows: readonly Workstream[] = canonical
      .filter((item) => !includedNames.has(item.label.toLowerCase()))
      .map((item): Workstream => ({
        id: `not-included-${item.id}`,
        name: item.label,
        projectId: '—',
        status: 'not_included',
        progress: 0,
        currentStage: '—',
        included: false,
      }));

    if (notIncludedRows.length === 0) return group;

    return { ...group, items: [...group.items, ...notIncludedRows] };
  });
}
