// ViewModel tests for the Fetch-from-ERP flow (DA-52 / DA-155). Verifies the
// hook gates on `connectionReady`, drives the FetchState lifecycle from the
// fetchCoa service result, feeds the migration store via setCoa with the SAME
// CoaRow shape the CSV parser produces, surfaces errors, supports re-fetch, and
// switches to CSV fallback.

import { act, renderHook } from '@testing-library/react-native';

// Avoid pulling the real http client (and its env/config) into the test.
jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// Keep the real service module (serializeProjectScopeDraft helpers etc. are not
// used from here, but the real fetchCoa types/exports must stay); mock only the
// network call.
jest.mock('@/features/projects/services/mcp.service', () => {
  const actual = jest.requireActual('@/features/projects/services/mcp.service');
  return { ...actual, fetchCoa: jest.fn() };
});

import { ok, err } from '@/shared/types/result.types';
import { fetchCoa } from '@/features/projects/services/mcp.service';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import type { CoaRow } from '@/features/projects/types/project-scope.types';
import { useMigrationStore } from '../../store/migration.store';
import { useFetchFromErp } from '../useFetchFromErp';

const mockFetchCoa = fetchCoa as jest.MockedFunction<typeof fetchCoa>;

// Fixtures carry a dynamic extra column (`currency`) on top of the normalized
// fields, proving CoaRow is the open Record<string, unknown> shape the CSV
// parser yields — what setCoa must receive unchanged.
const SAMPLE_COA_ROW: CoaRow = {
  accountCode: '1000',
  accountName: 'Cash',
  accountType: 'Asset',
  parent: null,
  currency: 'USD',
};

const SAMPLE_COA_ROW_2: CoaRow = {
  accountCode: '2000',
  accountName: 'Accounts Payable',
  accountType: 'Liability',
  parent: null,
  currency: 'EUR',
};

function primeConnectedMcp(): void {
  useProjectScopeStore.getState().setConnectionReady(true);
  useProjectScopeStore.getState().setMethod('mcp');
}

beforeEach(() => {
  mockFetchCoa.mockReset();
  useProjectScopeStore.getState().reset();
  useMigrationStore.getState().reset();
});

describe('useFetchFromErp — gating', () => {
  it('is a no-op while the connection is not ready', async () => {
    // connectionReady defaults to false after reset; method 'mcp' by default.
    const { result } = renderHook(() => useFetchFromErp());

    expect(result.current.connectionReady).toBe(false);

    await act(async () => {
      result.current.runFetch();
    });

    expect(mockFetchCoa).not.toHaveBeenCalled();
    expect(result.current.fetch.status).toBe('idle');
    expect(useMigrationStore.getState().sourceData).toEqual([]);
  });
});

describe('useFetchFromErp — success', () => {
  it('drives status/progress/counts/samples and mirrors fetchStatus to the store', async () => {
    mockFetchCoa.mockResolvedValue(
      ok({ source: [SAMPLE_COA_ROW], target: [SAMPLE_COA_ROW_2] }),
    );
    primeConnectedMcp();

    const { result } = renderHook(() => useFetchFromErp());

    await act(async () => {
      result.current.runFetch();
    });

    expect(mockFetchCoa).toHaveBeenCalledTimes(1);
    expect(result.current.fetch.status).toBe('success');
    expect(result.current.fetch.progress).toBe(100);
    expect(result.current.fetch.counts).toEqual({ source: 1, target: 1 });
    expect(result.current.fetch.sampleSource).toEqual([SAMPLE_COA_ROW]);
    expect(result.current.fetch.sampleTarget).toEqual([SAMPLE_COA_ROW_2]);
    expect(result.current.fetch.errorMessage).toBeNull();
    expect(useProjectScopeStore.getState().fetchStatus).toBe('success');
  });

  it('feeds the migration store via setCoa with the identical CoaRow shape', async () => {
    mockFetchCoa.mockResolvedValue(
      ok({ source: [SAMPLE_COA_ROW], target: [SAMPLE_COA_ROW_2] }),
    );
    primeConnectedMcp();

    const { result } = renderHook(() => useFetchFromErp());

    await act(async () => {
      result.current.runFetch();
    });

    // Proves setCoa received the same open-record CoaRow rows (normalized fields
    // + dynamic `currency` column) the CSV parser would produce.
    expect(useMigrationStore.getState().sourceData).toEqual([SAMPLE_COA_ROW]);
    expect(useMigrationStore.getState().targetData).toEqual([SAMPLE_COA_ROW_2]);
    expect(useMigrationStore.getState().sourceData[0]).toMatchObject({
      accountCode: '1000',
      accountName: 'Cash',
      accountType: 'Asset',
      parent: null,
      currency: 'USD',
    });
  });
});

describe('useFetchFromErp — error', () => {
  it('sets error status + message, mirrors fetchStatus, and does not touch the migration store', async () => {
    mockFetchCoa.mockResolvedValue(err({ code: 'HTTP_500', message: 'boom' }));
    primeConnectedMcp();

    const { result } = renderHook(() => useFetchFromErp());

    await act(async () => {
      result.current.runFetch();
    });

    expect(result.current.fetch.status).toBe('error');
    expect(result.current.fetch.errorMessage).toBe('boom');
    expect(useProjectScopeStore.getState().fetchStatus).toBe('error');
    // setCoa must NOT run on failure — migration data stays empty.
    expect(useMigrationStore.getState().sourceData).toEqual([]);
    expect(useMigrationStore.getState().targetData).toEqual([]);
  });
});

describe('useFetchFromErp — re-fetch', () => {
  it('re-runs fetchCoa and returns to success', async () => {
    mockFetchCoa.mockResolvedValue(
      ok({ source: [SAMPLE_COA_ROW], target: [SAMPLE_COA_ROW_2] }),
    );
    primeConnectedMcp();

    const { result } = renderHook(() => useFetchFromErp());

    await act(async () => {
      result.current.runFetch();
    });
    expect(result.current.fetch.status).toBe('success');

    await act(async () => {
      result.current.refetch();
    });

    expect(mockFetchCoa).toHaveBeenCalledTimes(2);
    expect(result.current.fetch.status).toBe('success');
  });
});

describe('useFetchFromErp — CSV fallback', () => {
  it('switches the project-scope draft method to csv', () => {
    const { result } = renderHook(() => useFetchFromErp());

    expect(useProjectScopeStore.getState().draft.method).toBe('mcp');

    act(() => {
      result.current.useCsvFallback();
    });

    expect(useProjectScopeStore.getState().draft.method).toBe('csv');
  });

  it('exposes the current method from the project-scope draft', () => {
    useProjectScopeStore.getState().setMethod('csv');
    const { result } = renderHook(() => useFetchFromErp());
    expect(result.current.method).toBe('csv');
  });
});
