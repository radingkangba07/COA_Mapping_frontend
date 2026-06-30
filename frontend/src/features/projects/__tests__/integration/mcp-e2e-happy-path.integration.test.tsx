// DA-93: E2E happy path through the MCP route, wired end-to-end with the REAL
// hooks + REAL stores + REAL services. Only the network boundary
// (httpClient.post) is mocked, so the real mcp.service zod-parsing and
// toCoaRow normalization run for real. The flow proves:
//   select MCP -> configure -> test connection (gate opens) -> fetch COA ->
//   fetched COA lands in the migration store as CoaRow (mapping reachable).

import { act, renderHook, waitFor } from '@testing-library/react-native';

// ─── Network boundary mock (must be declared before importing hooks) ─────────
// Both useFetchFromErp and useTestConnectionViewModel import this single
// http instance, so one mock covers both. We program `post` per-URL below.
jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: { post: jest.fn() },
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { httpClient } from '@/shared/services/http/http.instance';
import { useFetchFromErp } from '@/features/migration/hooks/useFetchFromErp';
import { useTestConnectionViewModel } from '@/features/projects/hooks/useTestConnectionViewModel';
import {
  createInitialMcpForm,
  type McpConnectionForm,
} from '@/features/projects/services/mcp.service';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { selectCanCreateProject } from '@/features/projects/store/project-scope.selectors';
import { useMigrationStore } from '@/features/migration/store/migration.store';
import type { ERPSystem } from '@/features/migration/types/erp.types';

// `post` is the only network call; type it as a Jest mock so we can program
// per-URL responses without touching the real service logic.
const postMock = httpClient.post as jest.MockedFunction<typeof httpClient.post>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SOURCE_ERP: ERPSystem = {
  id: 'sap',
  name: 'SAP',
  description: 'SAP source system',
  fields: [],
};

const TARGET_ERP: ERPSystem = {
  id: 'netsuite',
  name: 'Oracle NetSuite',
  description: 'NetSuite target system',
  fields: [],
};

const VALID_CONNECTION: McpConnectionForm = {
  ...createInitialMcpForm(),
  url: 'https://mcp.example.com',
  authType: 'bearer',
  token: 'abc-token',
};

// RAW backend-style rows (snake_case) so the test proves mcp.service.toCoaRow
// normalizes them into CoaRow (accountCode/accountName/accountType/parent).
const RAW_SOURCE_ROWS: ReadonlyArray<Record<string, unknown>> = [
  {
    account_code: '1000',
    account_name: 'Cash',
    account_type: 'Asset',
    parent_code: null,
  },
  {
    account_code: '1100',
    account_name: 'Accounts Receivable',
    account_type: 'Asset',
    parent_code: '1000',
  },
];

const RAW_TARGET_ROWS: ReadonlyArray<Record<string, unknown>> = [
  {
    account_code: '2000',
    account_name: 'Accounts Payable',
    account_type: 'Liability',
    parent_code: null,
  },
];

const TEST_CONNECTION_RESPONSE = {
  data: {
    timestamp: '2026-06-29T10:00:00.000Z',
    logs: ['Connected', 'Handshake OK'],
  },
};

const FETCH_COA_RESPONSE = {
  data: {
    source: [...RAW_SOURCE_ROWS],
    target: [...RAW_TARGET_ROWS],
  },
};

// Programs the shared `post` mock to resolve per endpoint URL.
function programNetwork(): void {
  postMock.mockImplementation((url: string) => {
    if (url === '/mcp/test-connection') {
      return Promise.resolve(TEST_CONNECTION_RESPONSE);
    }
    if (url === '/mcp/fetch-coa') {
      return Promise.resolve(FETCH_COA_RESPONSE);
    }
    return Promise.reject(new Error(`Unexpected POST to ${url}`));
  });
}

// Seeds a valid MCP project draft + migration ERPs so connectionReady is the
// ONLY remaining Create gate, and useFetchFromErp can read ERP names.
function seedValidMcpDraft(): void {
  const scope = useProjectScopeStore.getState();
  scope.setCompanyId('company-1');
  scope.setSource(SOURCE_ERP.id);
  scope.setTarget(TARGET_ERP.id);
  // Per-side MCP (VALID_CONNECTION has scope 'both' → one test opens both gates).
  scope.setSourceMethod('mcp');
  scope.setTargetMethod('mcp');

  const migration = useMigrationStore.getState();
  migration.setSourceERP(SOURCE_ERP);
  migration.setTargetERP(TARGET_ERP);
}

beforeEach(() => {
  postMock.mockReset();
  useProjectScopeStore.getState().reset();
  useMigrationStore.getState().reset();
});

// ─── DA-93: MCP happy path (one ordered E2E test) ────────────────────────────

describe('DA-93 MCP E2E happy path', () => {
  it('mcp happy path: select -> configure -> test -> fetch -> mapping reachable', async () => {
    // ── Step 1: SELECT MCP + CONFIGURE ──────────────────────────────────────
    programNetwork();
    seedValidMcpDraft();

    expect(useProjectScopeStore.getState().draft.method).toBe('mcp');
    expect(useProjectScopeStore.getState().draft.source).toBe(SOURCE_ERP.id);
    expect(useProjectScopeStore.getState().draft.target).toBe(TARGET_ERP.id);

    // Render the fetch hook so it observes the live store state.
    const fetchHook = renderHook(() => useFetchFromErp());

    expect(fetchHook.result.current.sourceErpName).toBe(SOURCE_ERP.name);
    expect(fetchHook.result.current.targetErpName).toBe(TARGET_ERP.name);

    // ── Step 2: GATE BEFORE TEST — runFetch() is a NO-OP (DA-50 gate) ────────
    expect(fetchHook.result.current.connectionReady).toBe(false);
    expect(fetchHook.result.current.fetch.status).toBe('idle');

    act(() => {
      fetchHook.result.current.runFetch();
    });

    // fetch-coa must NOT have been hit; migration store still has no COA.
    expect(postMock).not.toHaveBeenCalledWith(
      '/mcp/fetch-coa',
      expect.anything(),
    );
    expect(fetchHook.result.current.fetch.status).toBe('idle');
    expect(useProjectScopeStore.getState().fetchStatus).toBe('idle');
    expect(useMigrationStore.getState().sourceData).toEqual([]);
    expect(useMigrationStore.getState().targetData).toEqual([]);

    // ── Step 3: TEST CONNECTION — opens the gate ────────────────────────────
    const testHook = renderHook(() =>
      useTestConnectionViewModel(VALID_CONNECTION),
    );

    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);

    await act(async () => {
      await testHook.result.current.onTestConnection();
    });

    expect(testHook.result.current.status).toBe('success');
    expect(postMock).toHaveBeenCalledWith(
      '/mcp/test-connection',
      expect.anything(),
    );
    expect(useProjectScopeStore.getState().connectionReady).toBe(true);
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);

    // ── Step 4: FETCH COA — now that the gate is open ───────────────────────
    // Rerender the fetch hook so it reads connectionReady === true.
    fetchHook.rerender(undefined);
    expect(fetchHook.result.current.connectionReady).toBe(true);

    act(() => {
      fetchHook.result.current.runFetch();
    });

    await waitFor(() => {
      expect(fetchHook.result.current.fetch.status).toBe('success');
    });

    expect(fetchHook.result.current.fetch.counts).toEqual({
      source: RAW_SOURCE_ROWS.length,
      target: RAW_TARGET_ROWS.length,
    });
    expect(fetchHook.result.current.fetch.sampleSource.length).toBe(
      RAW_SOURCE_ROWS.length,
    );
    expect(fetchHook.result.current.fetch.sampleTarget.length).toBe(
      RAW_TARGET_ROWS.length,
    );

    // ── Step 5: MAPPING REACHABLE ───────────────────────────────────────────
    // The fetched COA must have landed in the migration store, normalized to
    // the CoaRow shape (accountCode/accountName/accountType present), matching
    // the raw rows we fed. This is the "mappingStep reachable" assertion.
    const migrationSource = useMigrationStore.getState().sourceData;
    const migrationTarget = useMigrationStore.getState().targetData;

    expect(migrationSource.length).toBe(RAW_SOURCE_ROWS.length);
    expect(migrationTarget.length).toBe(RAW_TARGET_ROWS.length);

    const firstSource = migrationSource[0];
    expect(firstSource).toBeDefined();
    expect(firstSource).toMatchObject({
      accountCode: '1000',
      accountName: 'Cash',
      accountType: 'Asset',
      parent: null,
    });

    const secondSource = migrationSource[1];
    expect(secondSource).toMatchObject({
      accountCode: '1100',
      accountName: 'Accounts Receivable',
      accountType: 'Asset',
      parent: '1000',
    });

    const firstTarget = migrationTarget[0];
    expect(firstTarget).toMatchObject({
      accountCode: '2000',
      accountName: 'Accounts Payable',
      accountType: 'Liability',
      parent: null,
    });

    // Create gate is still open after fetch — the project can be created and
    // the mapping step is reachable.
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);
    expect(useProjectScopeStore.getState().fetchStatus).toBe('success');

    fetchHook.unmount();
    testHook.unmount();
  });
});

// ─── CSV fallback escape hatch (documented MCP-unavailable path) ─────────────

describe('DA-93 CSV fallback', () => {
  it('useCsvFallback() flips the project-scope method to csv', () => {
    seedValidMcpDraft();
    expect(useProjectScopeStore.getState().draft.method).toBe('mcp');

    const { result } = renderHook(() => useFetchFromErp());

    act(() => {
      result.current.useCsvFallback();
    });

    expect(useProjectScopeStore.getState().draft.method).toBe('csv');
  });
});
