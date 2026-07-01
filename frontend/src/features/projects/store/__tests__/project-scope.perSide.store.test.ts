// Per-side METHODS are retained, but the connection split is collapsed back to a
// SINGLE shared connection. setSourceMethod/setTargetMethod mutate the draft
// independently; serializeProjectScopeDraft emits per-side methods + one
// connection; initFromSeed leaves both per-side methods at their 'csv' default.

import {
  createInitialDraft,
  serializeProjectScopeDraft,
  useProjectScopeStore,
} from '@/features/projects/store/project-scope.store';

describe('per-side methods + single-connection serialization', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('initFromSeed leaves both per-side methods at the csv default', () => {
    useProjectScopeStore
      .getState()
      .initFromSeed({ companyId: 'co-1', name: 'P' });

    const { draft } = useProjectScopeStore.getState();
    expect(draft.sourceMethod).toBe('csv');
    expect(draft.targetMethod).toBe('csv');
  });

  it('createInitialDraft seeds a single connection with the default source scope', () => {
    const draft = createInitialDraft();
    expect(draft.connection.scope).toBe('source');
    expect(draft.connection.headers).toEqual([]);
  });

  it('setSourceMethod / setTargetMethod mutate the draft independently', () => {
    const store = useProjectScopeStore.getState();
    store.setSourceMethod('mcp');
    expect(useProjectScopeStore.getState().draft.sourceMethod).toBe('mcp');
    expect(useProjectScopeStore.getState().draft.targetMethod).toBe('csv');

    store.setTargetMethod('mcp');
    expect(useProjectScopeStore.getState().draft.targetMethod).toBe('mcp');
  });

  it('updateConnection merges into the single shared connection', () => {
    const store = useProjectScopeStore.getState();
    store.updateConnection({ url: 'https://shared.example.com', token: 'tok' });

    const { connection } = useProjectScopeStore.getState().draft;
    expect(connection.url).toBe('https://shared.example.com');
    expect(connection.token).toBe('tok');
  });

  it('serializeProjectScopeDraft emits per-side methods + a single connection', () => {
    const store = useProjectScopeStore.getState();
    store.setSourceMethod('mcp');
    store.setTargetMethod('csv');
    store.updateConnection({ url: 'https://shared', token: 'tok' });

    const payload = serializeProjectScopeDraft(
      useProjectScopeStore.getState().draft,
    );

    expect(payload.source_method).toBe('mcp');
    expect(payload.target_method).toBe('csv');
    expect(payload.connection.url).toBe('https://shared');
    expect(payload.connection.token).toBe('tok');
    expect(payload.connection.scope).toBe('source');
  });
});
