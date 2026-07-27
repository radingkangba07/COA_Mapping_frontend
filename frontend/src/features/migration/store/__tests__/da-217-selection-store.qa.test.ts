// DA-217 (AC: DA-166) — QA: Selection state & store layer verification.
// The store is UI-less, so the selection behaviour is verified directly against
// the migration store + selectors + tri-state helper.

import { useMigrationStore } from '@/features/migration/store/migration.store';
import {
  selectSelectedMappings,
  selectSelectedCount,
  selectDeletedAccounts,
} from '@/features/migration/store/migration.selectors';
import { selectionKey, computeTriState } from '@/features/migration/utils/selection.utils';
import type { GroupedMapping, AccountMapping } from '@/features/migration/types/mapping.types';

// ─── Fixtures ────────────────────────────────────────────────────────────────
const cash: AccountMapping = { source_number: '1000', source_name: 'Cash', target_name: 'Cash and Bank', score: 92, remark: 'Auto' };
const ar: AccountMapping = { source_number: '1100', source_name: 'AR', target_name: 'Accounts Receivable', score: 88, remark: 'Auto' };
const ap: AccountMapping = { source_number: '2000', source_name: 'AP', target_name: 'Accounts Payable', score: 90, remark: 'Auto' };

const GROUPS: GroupedMapping[] = [
  { source_type: 'Asset', target_type: 'Assets', confidence: 95, accounts: [cash, ar] },
  { source_type: 'Liability', target_type: 'Liabilities', confidence: 80, accounts: [ap] },
];

const kCash = selectionKey('Asset', cash);
const kAr = selectionKey('Asset', ar);
const kAp = selectionKey('Liability', ap);

beforeEach(() => {
  useMigrationStore.getState().reset();
  useMigrationStore.getState().setGroupedMappings(GROUPS);
});

describe('DA-217 Selection state & store layer', () => {
  // computeTriState (pure helper)
  describe('computeTriState', () => {
    const visible = [kCash, kAr, kAp];
    it('is false when nothing is selected', () => {
      expect(computeTriState({}, visible)).toBe(false);
    });
    it('is true when all visible keys are selected', () => {
      expect(computeTriState({ [kCash]: true, [kAr]: true, [kAp]: true }, visible)).toBe(true);
    });
    it("is 'indeterminate' when only some are selected", () => {
      expect(computeTriState({ [kCash]: true }, visible)).toBe('indeterminate');
    });
    it('is false for an empty visible set', () => {
      expect(computeTriState({ [kCash]: true }, [])).toBe(false);
    });
  });

  // Toggle membership
  it('toggleAccountSelection adds then removes a key', () => {
    useMigrationStore.getState().toggleAccountSelection('Asset', cash);
    expect(useMigrationStore.getState().selection[kCash]).toBe(true);
    useMigrationStore.getState().toggleAccountSelection('Asset', cash);
    expect(useMigrationStore.getState().selection[kCash]).toBeUndefined();
  });

  // setSelectionForKeys
  it('setSelectionForKeys selects and deselects a batch', () => {
    useMigrationStore.getState().setSelectionForKeys([kCash, kAr, kAp], true);
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(3);
    useMigrationStore.getState().setSelectionForKeys([kCash, kAr], false);
    expect(useMigrationStore.getState().selection[kCash]).toBeUndefined();
    expect(useMigrationStore.getState().selection[kAp]).toBe(true);
  });

  // clearSelection
  it('clearSelection empties the selection', () => {
    useMigrationStore.getState().setSelectionForKeys([kCash, kAp], true);
    useMigrationStore.getState().clearSelection();
    expect(useMigrationStore.getState().selection).toEqual({});
    expect(selectSelectedCount(useMigrationStore.getState())).toBe(0);
  });

  // selectSelectedMappings — groups filtered to selected accounts only
  it('selectSelectedMappings returns only the selected accounts', () => {
    useMigrationStore.getState().setSelectionForKeys([kCash, kAp], true);
    const selected = selectSelectedMappings(useMigrationStore.getState());
    const names = selected.flatMap((g) => g.accounts.map((a) => a.source_name));
    expect(names.sort()).toEqual(['AP', 'Cash']);
    expect(names).not.toContain('AR');
  });

  // bulkDeleteSelected — moves to deleted accounts and clears selection
  it('bulkDeleteSelected deletes selected accounts across groups and clears selection', () => {
    useMigrationStore.getState().setSelectionForKeys([kCash, kAp], true);
    const deletedBefore = selectDeletedAccounts(useMigrationStore.getState()).length;

    useMigrationStore.getState().bulkDeleteSelected();
    const state = useMigrationStore.getState();

    // Cash and AP now appear in the deleted list (across two different groups)
    const deleted = selectDeletedAccounts(state);
    expect(deleted.length).toBe(deletedBefore + 2);
    const deletedBlob = JSON.stringify(deleted);
    expect(deletedBlob).toContain('Cash');
    expect(deletedBlob).toContain('AP');

    // Deleted accounts are no longer part of the selectable/selected set
    const activeSelected = selectSelectedMappings(state).flatMap((g) => g.accounts.map((a) => a.source_name));
    expect(activeSelected).not.toContain('Cash');
    expect(activeSelected).not.toContain('AP');

    // Selection cleared for the deleted keys
    expect(state.selection[kCash]).toBeUndefined();
    expect(state.selection[kAp]).toBeUndefined();
  });

  // Selection identity is stable across index/order changes
  it('selectionKey is stable regardless of array position', () => {
    const keyA = selectionKey('Asset', cash);
    // Re-seed with the account at a different index; key must be identical.
    useMigrationStore.getState().setGroupedMappings([
      { source_type: 'Asset', target_type: 'Assets', confidence: 95, accounts: [ar, cash] },
      ...GROUPS.slice(1),
    ]);
    const keyB = selectionKey('Asset', cash);
    expect(keyB).toBe(keyA);
  });
});
