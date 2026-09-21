import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type { OrgProjectFilesResult, PersistedFile } from '../../services/entity-pack.service';

const mockListWorkstreamFiles = jest.fn<Promise<Result<OrgProjectFilesResult, AppError>>, [string, string?, string?]>();

jest.mock('../../services/entity-pack.service', () => ({
  listWorkstreamFiles: (workstreamId: string, entityId?: string, orgProjectId?: string) =>
    mockListWorkstreamFiles(workstreamId, entityId, orgProjectId),
  // Real implementation (pure) — useOrgProjectFiles filters the fetched
  // list through matchesWorkstream, so it must actually exist on the
  // mocked module.
  matchesWorkstream: jest.requireActual('../../services/entity-pack.service').matchesWorkstream,
}));

import { useOrgProjectFiles } from '../useOrgProjectFiles';

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeFile(overrides: Partial<PersistedFile> = {}): PersistedFile {
  return {
    id: 'file-1',
    fileType: 'source_erp',
    originalFilename: 'customers.csv',
    storagePath: '/storage/file-1',
    contentType: 'text/csv',
    sizeBytes: 2048,
    status: 'ready',
    columns: ['Account No', 'Customer Name'],
    rowCount: 12,
    createdAt: '2026-09-01T00:00:00Z',
    // matchesWorkstream (used by useOrgProjectFiles to filter every file it
    // gets back) only rejects a file that actually carries a workstreamId
    // disagreeing with what was asked for — every test here calls
    // useOrgProjectFiles('org-1', 'ws-1', 'customers'), so this fixture
    // matches 'ws-1' by default to pass through undisturbed. entity_id is
    // set here for realism but plays no part in the filter — the live
    // backend has no such field (see matchesWorkstream's own comment).
    orgProjectId: 'org-1',
    workstreamId: 'ws-1',
    entityId: 'customers',
    ...overrides,
  };
}

function makeResult(files: PersistedFile[], total = files.length): OrgProjectFilesResult {
  return { files, total };
}

describe('useOrgProjectFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call listWorkstreamFiles and returns idle defaults when workstream_id is omitted', () => {
    const { result } = renderHook(() => useOrgProjectFiles('org-1'), { wrapper: createWrapper() });

    expect(result.current).toEqual(
      expect.objectContaining({ files: [], total: 0, hasFile: false, latestFile: null, isLoading: false, error: null }),
    );
    expect(mockListWorkstreamFiles).not.toHaveBeenCalled();
  });

  it('fetches by workstream_id+entityId+org_project_id and exposes files[0] as latestFile, with hasFile true', async () => {
    const first = makeFile({ id: 'file-1' });
    const second = makeFile({ id: 'file-2' });
    mockListWorkstreamFiles.mockResolvedValue(ok(makeResult([first, second])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.files).toHaveLength(2));

    expect(mockListWorkstreamFiles).toHaveBeenCalledWith('ws-1', 'customers', 'org-1');
    expect(result.current.latestFile).toEqual(first);
    expect(result.current.total).toBe(2);
    expect(result.current.hasFile).toBe(true);
  });

  it('reports latestFile null, hasFile false and an empty files list when the workstream has no files', async () => {
    mockListWorkstreamFiles.mockResolvedValue(ok(makeResult([])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.files).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasFile).toBe(false);
    expect(result.current.latestFile).toBeNull();
  });

  it('treats total=0 as no file even if files somehow carries an entry', async () => {
    mockListWorkstreamFiles.mockResolvedValue(ok(makeResult([makeFile()], 0)));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasFile).toBe(false);
  });

  it('drops a file whose own workstream_id disagrees with what was asked for, even though the server returned it', async () => {
    mockListWorkstreamFiles.mockResolvedValue(ok(makeResult([makeFile({ workstreamId: 'ws-other' })])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.files).toEqual([]);
    expect(result.current.hasFile).toBe(false);
    expect(result.current.latestFile).toBeNull();
  });

  it('lets a file through when it disagrees only on entity_id — entity_id plays no part in the filter (the live backend has no such field)', async () => {
    mockListWorkstreamFiles.mockResolvedValue(ok(makeResult([makeFile({ entityId: 'vendors' })])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasFile).toBe(true);
  });

  it('lets a file through when it omits workstream_id entirely — matches today\'s real FileResponse shape, which never returns it', async () => {
    mockListWorkstreamFiles.mockResolvedValue(ok(makeResult([makeFile({ workstreamId: undefined })])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasFile).toBe(true);
  });

  it('surfaces the service error and keeps files empty when the fetch fails', async () => {
    mockListWorkstreamFiles.mockResolvedValue(err({ code: 'HTTP_404', message: 'not found' }));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.files).toEqual([]);
    expect(result.current.hasFile).toBe(false);
    expect(result.current.latestFile).toBeNull();
    expect(result.current.error).toEqual({ code: 'HTTP_404', message: 'not found' });
  });
});
