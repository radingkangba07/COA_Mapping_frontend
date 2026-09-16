import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok, err } from '@/shared/types/result.types';
import type { Result, AppError } from '@/shared/types/result.types';
import type { OrgProjectFilesResult, PersistedFile } from '../../services/entity-pack.service';

const mockListOrgProjectFiles = jest.fn<Promise<Result<OrgProjectFilesResult, AppError>>, [string, string?, string?]>();

jest.mock('../../services/entity-pack.service', () => ({
  listOrgProjectFiles: (orgProjectId: string, workstreamId?: string, entityId?: string) =>
    mockListOrgProjectFiles(orgProjectId, workstreamId, entityId),
  // Real implementation (pure) — useOrgProjectFiles filters the fetched
  // list through this, so it must actually exist on the mocked module.
  fileMatchesContext: jest.requireActual('../../services/entity-pack.service').fileMatchesContext,
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
    // fileMatchesContext (used by useOrgProjectFiles to filter every file it
    // gets back) does a strict equality check on the fields the response
    // actually carries — every test here calls useOrgProjectFiles('org-1',
    // 'ws-1', 'customers'), so a fixture file needs matching values to pass
    // through instead of being filtered out as a mismatch.
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

  it('does not call listOrgProjectFiles and returns idle defaults when orgProjectId is empty', () => {
    const { result } = renderHook(() => useOrgProjectFiles(''), { wrapper: createWrapper() });

    expect(result.current).toEqual(
      expect.objectContaining({ files: [], total: 0, hasFile: false, latestFile: null, isLoading: false, error: null }),
    );
    expect(mockListOrgProjectFiles).not.toHaveBeenCalled();
  });

  it('fetches by orgProjectId+workstreamId+entityId and exposes files[0] as latestFile, with hasFile true', async () => {
    const first = makeFile({ id: 'file-1' });
    const second = makeFile({ id: 'file-2' });
    mockListOrgProjectFiles.mockResolvedValue(ok(makeResult([first, second])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.files).toHaveLength(2));

    expect(mockListOrgProjectFiles).toHaveBeenCalledWith('org-1', 'ws-1', 'customers');
    expect(result.current.latestFile).toEqual(first);
    expect(result.current.total).toBe(2);
    expect(result.current.hasFile).toBe(true);
  });

  it('reports latestFile null, hasFile false and an empty files list when the project has no files', async () => {
    mockListOrgProjectFiles.mockResolvedValue(ok(makeResult([])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.files).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasFile).toBe(false);
    expect(result.current.latestFile).toBeNull();
  });

  it('treats total=0 as no file even if files somehow carries an entry', async () => {
    mockListOrgProjectFiles.mockResolvedValue(ok(makeResult([makeFile()], 0)));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasFile).toBe(false);
  });

  it('drops a file whose own entity_id disagrees with what was asked for, even though the server returned it', async () => {
    mockListOrgProjectFiles.mockResolvedValue(ok(makeResult([makeFile({ entityId: 'vendors' })])));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.files).toEqual([]);
    expect(result.current.hasFile).toBe(false);
    expect(result.current.latestFile).toBeNull();
  });

  it('surfaces the service error and keeps files empty when the fetch fails', async () => {
    mockListOrgProjectFiles.mockResolvedValue(err({ code: 'HTTP_404', message: 'not found' }));

    const { result } = renderHook(() => useOrgProjectFiles('org-1', 'ws-1', 'customers'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.files).toEqual([]);
    expect(result.current.hasFile).toBe(false);
    expect(result.current.latestFile).toBeNull();
    expect(result.current.error).toEqual({ code: 'HTTP_404', message: 'not found' });
  });
});
