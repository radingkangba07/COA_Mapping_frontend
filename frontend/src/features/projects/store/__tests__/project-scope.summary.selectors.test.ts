import {
  INITIAL_MEMBERS,
  useProjectScopeStore,
} from '@/features/projects/store/project-scope.store';
import {
  masterDataColumnKey,
  selectProjectSummary,
} from '@/features/projects/store/project-scope.selectors';
import {
  CHART_OF_ACCOUNTS_ID,
  MASTER_DATA_ITEMS,
  OPENING_BALANCE_ITEMS,
} from '@/features/projects/components/MigrationScope.config';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('selectProjectSummary', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('reports the initial draft state', () => {
    const summary = selectProjectSummary(useProjectScopeStore.getState());

    expect(summary.source).toBeNull();
    expect(summary.target).toBeNull();
    expect(summary.sourceMethod).toBe('csv');
    expect(summary.targetMethod).toBe('csv');
    expect(summary.masterDataCount).toBe(0);
    expect(summary.masterDataTotal).toBe(MASTER_DATA_ITEMS.length);
    expect(summary.openingBalancesCount).toBe(0);
    expect(summary.openingBalancesTotal).toBe(OPENING_BALANCE_ITEMS.length);
    expect(summary.members).toBe(INITIAL_MEMBERS.length);
  });

  it('reflects setSource and setTarget', () => {
    const store = useProjectScopeStore.getState();
    store.setSource('sap');
    store.setTarget('netsuite');

    const summary = selectProjectSummary(useProjectScopeStore.getState());
    expect(summary.source).toBe('sap');
    expect(summary.target).toBe('netsuite');
  });

  it('reflects per-side method setters independently', () => {
    useProjectScopeStore.getState().setSourceMethod('mcp');

    const summary = selectProjectSummary(useProjectScopeStore.getState());
    expect(summary.sourceMethod).toBe('mcp');
    expect(summary.targetMethod).toBe('csv');
  });

  it('counts distinct master-data items, not columns', () => {
    const store = useProjectScopeStore.getState();

    // Both columns of ONE item -> distinct count stays 1.
    store.toggleMasterData(
      masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'dataConversion'),
    );
    store.toggleMasterData(masterDataColumnKey(CHART_OF_ACCOUNTS_ID, 'mdm'));
    expect(
      selectProjectSummary(useProjectScopeStore.getState()).masterDataCount,
    ).toBe(1);

    // A second distinct item -> count becomes 2.
    store.toggleMasterData(masterDataColumnKey('customers', 'dataConversion'));
    expect(
      selectProjectSummary(useProjectScopeStore.getState()).masterDataCount,
    ).toBe(2);
  });

  it('counts toggled opening-balance ids', () => {
    const store = useProjectScopeStore.getState();
    store.toggleOpeningBalances(OPENING_BALANCE_ITEMS[0]?.id ?? '');
    store.toggleOpeningBalances(OPENING_BALANCE_ITEMS[1]?.id ?? '');

    expect(
      selectProjectSummary(useProjectScopeStore.getState())
        .openingBalancesCount,
    ).toBe(2);
  });

  it('counts added members', () => {
    const store = useProjectScopeStore.getState();
    store.addMember({ id: 'u1', name: 'A', email: 'a@x.com', role: 'admin' });
    store.addMember({ id: 'u2', name: 'B', email: 'b@x.com', role: 'editor' });

    expect(
      selectProjectSummary(useProjectScopeStore.getState()).members,
    ).toBe(INITIAL_MEMBERS.length + 2);
  });
});
