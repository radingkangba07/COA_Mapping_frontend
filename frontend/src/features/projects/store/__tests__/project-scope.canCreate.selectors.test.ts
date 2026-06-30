// DA-58: per-side Create gate. selectCanCreateProject requires company +
// distinct ERPs, and — independently per side — either CSV (no test connection)
// or MCP with that side's successful test connection.

import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { selectCanCreateProject } from '@/features/projects/store/project-scope.selectors';
import type { ConnectionMethod } from '@/features/projects/types/project-scope.types';

function seed(
  sourceMethod: ConnectionMethod,
  targetMethod: ConnectionMethod,
): void {
  const store = useProjectScopeStore.getState();
  store.setCompanyId('co-1');
  store.setSource('sap');
  store.setTarget('netsuite');
  store.setSourceMethod(sourceMethod);
  store.setTargetMethod(targetMethod);
}

const canCreate = (): boolean =>
  selectCanCreateProject(useProjectScopeStore.getState());

describe('DA-58 selectCanCreateProject — per-side gate', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('csv/csv enables Create with no test connection', () => {
    seed('csv', 'csv');
    expect(canCreate()).toBe(true);
  });

  it('mcp source requires the source connection to be ready', () => {
    seed('mcp', 'csv');
    expect(canCreate()).toBe(false);

    useProjectScopeStore.getState().setSourceConnectionReady(true);
    expect(canCreate()).toBe(true);
  });

  it('mcp target requires the target connection to be ready', () => {
    seed('csv', 'mcp');
    expect(canCreate()).toBe(false);

    useProjectScopeStore.getState().setTargetConnectionReady(true);
    expect(canCreate()).toBe(true);
  });

  it('mcp/mcp requires BOTH sides ready independently', () => {
    seed('mcp', 'mcp');
    expect(canCreate()).toBe(false);

    useProjectScopeStore.getState().setSourceConnectionReady(true);
    expect(canCreate()).toBe(false);

    useProjectScopeStore.getState().setTargetConnectionReady(true);
    expect(canCreate()).toBe(true);
  });

  it('requires distinct ERPs even when both sides are csv', () => {
    const store = useProjectScopeStore.getState();
    store.setCompanyId('co-1');
    store.setSource('sap');
    store.setTarget('sap');
    expect(canCreate()).toBe(false);
  });

  it('requires a company even when the per-side gates are satisfied', () => {
    const store = useProjectScopeStore.getState();
    store.setSource('sap');
    store.setTarget('netsuite');
    // csv/csv defaults => per-side gates satisfied, but company is missing.
    expect(canCreate()).toBe(false);
  });
});
