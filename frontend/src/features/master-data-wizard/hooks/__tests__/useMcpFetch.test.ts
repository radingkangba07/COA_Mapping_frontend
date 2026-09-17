import { renderHook, act, waitFor } from '@testing-library/react-native';

// ─── Mock httpClient before importing the hook ───────────────────────────────

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('@/shared/services/http/http.client', () => ({
  toAppError: (e: unknown) => ({
    message: e instanceof Error ? e.message : String(e),
  }),
}));

jest.mock('@/shared/services/crypto/credentials.crypto', () => ({
  encryptCredentials: jest.fn((creds: Record<string, string>) =>
    Promise.resolve(Buffer.from(JSON.stringify(creds)).toString('base64')),
  ),
}));

const mockSetMcpFetchData = jest.fn();
const mockStoreState = {
  mcpFetchData: {} as Record<string, unknown>,
  setMcpFetchData: (...args: unknown[]) => mockSetMcpFetchData(...args),
};

jest.mock('@/features/projects/store/project-scope.store', () => ({
  useProjectScopeStore: (selector: (s: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
}));

import { useMcpFetch } from '../useMcpFetch';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeResponse(overrides: Partial<{
  scope: string;
  records: Record<string, unknown>[];
  fields: string[];
  total: number;
  storage_path: string;
}> = {}) {
  return {
    scope: 'items',
    records: [{ name: 'Widget' }],
    fields: ['name'],
    total: 1,
    storage_path: '/spaces/snap.csv',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useMcpFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.mcpFetchData = {};
    // Default: snapshot endpoint returns nothing (404-like rejection)
    mockGet.mockRejectedValue(new Error('not found'));
  });

  it('starts with empty state and isFetching false when no cache exists', () => {
    const { result } = renderHook(() =>
      useMcpFetch(null, null, 'items', null),
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.records).toEqual([]);
    expect(result.current.fields).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.hasFetchedInSession).toBe(false);
  });

  it('returns cached data immediately when store has a cache entry', async () => {
    const cached = {
      records: [{ id: 1 }],
      fields: ['id'],
      total: 1,
      storagePath: '/snap.csv',
    };
    mockStoreState.mcpFetchData = { 'ws-1:items': cached };

    const { result } = renderHook(() =>
      useMcpFetch('conn-1', { api_key: 'k' }, 'items', 'ws-1'),
    );

    // No loading state — served from cache
    expect(result.current.records).toEqual([{ id: 1 }]);
    expect(result.current.fields).toEqual(['id']);
    expect(result.current.total).toBe(1);
    expect(result.current.snapshotStoragePath).toBe('/snap.csv');
    // snapshot/live endpoints should NOT be called
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('loads snapshot on mount when workstreamId is provided and no cache exists', async () => {
    mockGet.mockResolvedValue({ data: makeResponse({ storage_path: '/snap.csv' }) });

    const { result } = renderHook(() =>
      useMcpFetch('conn-1', { api_key: 'k' }, 'items', 'ws-42'),
    );

    await waitFor(() => expect(result.current.total).toBe(1));

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('workstream_id=ws-42'),
    );
    expect(result.current.snapshotStoragePath).toBe('/snap.csv');
    expect(result.current.records).toEqual([{ name: 'Widget' }]);
  });

  it('falls back to live fetch when snapshot 404s and credentials are present', async () => {
    mockGet.mockRejectedValue(new Error('not found'));
    mockPost.mockResolvedValue({ data: makeResponse({ total: 5 }) });

    const { result } = renderHook(() =>
      useMcpFetch('conn-1', { api_key: 'k' }, 'items', 'ws-1'),
    );

    await waitFor(() => expect(result.current.total).toBe(5));

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/mcp-clients/conn-1/fetch-records',
      expect.objectContaining({ scope: 'items', encrypted_credentials: expect.any(String) }),
    );
  });

  it('does not live-fetch on mount when connectionId is null', async () => {
    // snapshot also fails
    mockGet.mockRejectedValue(new Error('not found'));

    renderHook(() => useMcpFetch(null, null, 'items', 'ws-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('fetch(): posts to the live endpoint and updates state', async () => {
    mockPost.mockResolvedValue({ data: makeResponse({ total: 3, fields: ['name', 'code'] }) });

    const { result } = renderHook(() =>
      useMcpFetch('conn-1', { api_key: 'key' }, 'customers', null),
    );

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.total).toBe(3);
    expect(result.current.fields).toEqual(['name', 'code']);
    expect(result.current.hasFetchedInSession).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockSetMcpFetchData).toHaveBeenCalled();
  });

  it('fetch(): sets error and clears isFetching when the POST fails', async () => {
    mockPost.mockRejectedValue(new Error('adapter_not_found'));

    const { result } = renderHook(() =>
      useMcpFetch('conn-1', { api_key: 'k' }, 'items', null),
    );

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toContain('adapter_not_found');
    expect(result.current.hasFetchedInSession).toBe(false);
  });

  it('fetch(): sets "No MCP connection available" when connectionId is null', async () => {
    const { result } = renderHook(() =>
      useMcpFetch(null, null, 'items', null),
    );

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.error).toBe('No MCP connection available');
    expect(mockPost).not.toHaveBeenCalled();
  });
});
