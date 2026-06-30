// DA-59: per-side store + serialization. setSourceMethod/setTargetMethod mutate
// the draft independently; serializeProjectScopeDraft emits per-side method +
// connection; initFromSeed leaves both per-side methods at their 'csv' default.

import {
  createInitialDraft,
  serializeProjectScopeDraft,
  useProjectScopeStore,
} from '@/features/projects/store/project-scope.store';

describe('DA-59 per-side methods + serialization', () => {
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

  it('createInitialDraft seeds independent per-side connections with their scope', () => {
    const draft = createInitialDraft();
    expect(draft.sourceConnection.scope).toBe('source');
    expect(draft.targetConnection.scope).toBe('target');
    expect(draft.sourceConnection).not.toBe(draft.targetConnection);
  });

  it('setSourceMethod / setTargetMethod mutate the draft independently', () => {
    const store = useProjectScopeStore.getState();
    store.setSourceMethod('mcp');
    expect(useProjectScopeStore.getState().draft.sourceMethod).toBe('mcp');
    expect(useProjectScopeStore.getState().draft.targetMethod).toBe('csv');

    store.setTargetMethod('mcp');
    expect(useProjectScopeStore.getState().draft.targetMethod).toBe('mcp');
  });

  it('updateSourceConnection / updateTargetConnection do not bleed across sides', () => {
    const store = useProjectScopeStore.getState();
    store.updateSourceConnection({ url: 'https://source.example.com' });
    store.updateTargetConnection({ url: 'https://target.example.com' });

    const { sourceConnection, targetConnection } =
      useProjectScopeStore.getState().draft;
    expect(sourceConnection.url).toBe('https://source.example.com');
    expect(targetConnection.url).toBe('https://target.example.com');
  });

  it('serializeProjectScopeDraft emits per-side method + connection', () => {
    const store = useProjectScopeStore.getState();
    store.setSourceMethod('mcp');
    store.setTargetMethod('csv');
    store.updateSourceConnection({ url: 'https://source', token: 'tok' });
    store.updateTargetConnection({ url: 'https://target' });

    const payload = serializeProjectScopeDraft(
      useProjectScopeStore.getState().draft,
    );

    expect(payload.source_method).toBe('mcp');
    expect(payload.target_method).toBe('csv');
    expect(payload.source_connection.url).toBe('https://source');
    expect(payload.source_connection.token).toBe('tok');
    expect(payload.source_connection.scope).toBe('source');
    expect(payload.target_connection.url).toBe('https://target');
    expect(payload.target_connection.scope).toBe('target');
  });
});
