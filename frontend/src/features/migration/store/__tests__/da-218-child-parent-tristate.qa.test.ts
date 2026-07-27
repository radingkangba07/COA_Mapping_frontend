// DA-218 (AC: DA-21) — QA: Individual child checkbox selection updates the
// parent group checkbox state (tri-state). Verified against the store +
// computeTriState (the parent header derives its state from the children).

import { useMigrationStore } from '@/features/migration/store/migration.store';
import { selectSelectedCount } from '@/features/migration/store/migration.selectors';
import { selectionKey, computeTriState } from '@/features/migration/utils/selection.utils';
import type { GroupedMapping, AccountMapping } from '@/features/migration/types/mapping.types';

const cash: AccountMapping = { source_number: '1000', source_name: 'Cash', target_name: 'Cash', score: 90, remark: 'Auto' };
const ar: AccountMapping = { source_number: '1100', source_name: 'AR', target_name: 'Receivable', score: 88, remark: 'Auto' };
const inv: AccountMapping = { source_number: '1200', source_name: 'Inventory', target_name: 'Stock', score: 85, remark: 'Auto' };

const GROUP: GroupedMapping = { source_type: 'Asset', target_type: 'Assets', confidence: 95, accounts: [cash, ar, inv] };
const GROUP_KEYS = [selectionKey('Asset', cash), selectionKey('Asset', ar), selectionKey('Asset', inv)];

/** Parent header state derived from the current selection over the group's children. */
function parentState(): boolean | 'indeterminate' {
  return computeTriState(useMigrationStore.getState().selection, GROUP_KEYS);
}
function toggle(account: AccountMapping): void {
  useMigrationStore.getState().toggleAccountSelection('Asset', account);
}

beforeEach(() => {
  useMigrationStore.getState().reset();
  useMigrationStore.getState().setGroupedMappings([GROUP]);
});

describe('DA-218 Child → parent group checkbox tri-state', () => {
  // Baseline: nothing selected → parent UNCHECKED, count 0
  it('parent starts UNCHECKED with no children selected', () => {
    expect(parentState()).toBe(false);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(0);
  });

  // AC: checking the last unchecked child sets parent to CHECKED
  it('checking the last unchecked child sets parent CHECKED', () => {
    toggle(cash);
    expect(parentState()).toBe('indeterminate');
    toggle(ar);
    expect(parentState()).toBe('indeterminate');
    toggle(inv); // last unchecked child
    expect(parentState()).toBe(true);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(3);
  });

  // AC: unchecking any child when all were checked sets parent to INDETERMINATE
  it('unchecking one child when all are checked sets parent INDETERMINATE', () => {
    toggle(cash);
    toggle(ar);
    toggle(inv);
    expect(parentState()).toBe(true);

    toggle(ar); // uncheck one
    expect(parentState()).toBe('indeterminate');
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(2);
  });

  // AC: unchecking the last checked child sets parent to UNCHECKED
  it('unchecking the last checked child sets parent UNCHECKED', () => {
    toggle(cash); // only one selected
    expect(parentState()).toBe('indeterminate');
    toggle(cash); // uncheck the last checked child
    expect(parentState()).toBe(false);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(0);
  });

  // AC: summary count updates immediately on each child toggle
  it('summary count updates immediately on each toggle', () => {
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(0);
    toggle(cash);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(1);
    toggle(inv);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(2);
    toggle(cash);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(1);
  });
});
