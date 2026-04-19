import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { listMappingSuggestions } from '../suggestions.service';
import type { SuggestionGroupDTO } from '@/features/migration/types/suggestion.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

type MockClient = jest.Mocked<Pick<AxiosInstance, 'get'>>;

function createMockClient(): MockClient {
  return { get: jest.fn() };
}

function axiosOk<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

const group: SuggestionGroupDTO = {
  source_type: 'Asset',
  target_type: 'Fixed Asset',
  confidence: 0.95,
  accounts: [
    {
      id: 'a1',
      source_name: 'Cash',
      target_name: 'Cash at Bank',
      score: 0.97,
      status: 'pending',
      mapping_source: 'fuzzy',
    },
  ],
};

// ─── Query param passthrough ───────────────────────────────────────────────

describe('listMappingSuggestions — query params', () => {
  it('passes status, source_type, skip, limit to the request', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(axiosOk<SuggestionGroupDTO[]>([]));

    await listMappingSuggestions(client as unknown as AxiosInstance, 'proj-1', {
      status: 'pending',
      sourceType: 'Asset',
      skip: 10,
      limit: 50,
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/suggestions',
      {
        params: {
          status: 'pending',
          source_type: 'Asset',
          skip: 10,
          limit: 50,
        },
      },
    );
  });

  it('omits params when no options are supplied', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(axiosOk<SuggestionGroupDTO[]>([]));

    await listMappingSuggestions(client as unknown as AxiosInstance, 'proj-1');

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/suggestions',
      { params: {} },
    );
  });

  it('drops empty string filters', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(axiosOk<SuggestionGroupDTO[]>([]));

    await listMappingSuggestions(client as unknown as AxiosInstance, 'proj-1', {
      status: '',
      sourceType: '',
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/suggestions',
      { params: {} },
    );
  });
});

// ─── Success path ──────────────────────────────────────────────────────────

describe('listMappingSuggestions — success', () => {
  it('returns ok and maps snake_case to camelCase', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(axiosOk<SuggestionGroupDTO[]>([group]));

    const result = await listMappingSuggestions(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.sourceType).toBe('Asset');
    expect(result.data[0]?.targetType).toBe('Fixed Asset');
    expect(result.data[0]?.accounts[0]?.sourceName).toBe('Cash');
    expect(result.data[0]?.accounts[0]?.mappingSource).toBe('fuzzy');
  });

  it('handles an empty array response', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(axiosOk<SuggestionGroupDTO[]>([]));

    const result = await listMappingSuggestions(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it('normalizes missing mapping_source to null', async () => {
    const client = createMockClient();
    const groupNoMapping: SuggestionGroupDTO = {
      ...group,
      accounts: [
        {
          id: 'a1',
          source_name: 'Cash',
          target_name: 'Cash',
          score: 0.8,
          status: 'pending',
        },
      ],
    };
    client.get.mockResolvedValue(axiosOk<SuggestionGroupDTO[]>([groupNoMapping]));

    const result = await listMappingSuggestions(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0]?.accounts[0]?.mappingSource).toBeNull();
    }
  });
});

// ─── Error path ────────────────────────────────────────────────────────────

describe('listMappingSuggestions — errors', () => {
  it('returns err on network failure', async () => {
    const client = createMockClient();
    client.get.mockRejectedValue(new AxiosError('Network failure', 'ECONNABORTED'));

    const result = await listMappingSuggestions(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_0');
      expect(result.error.message).toBe('Network failure');
    }
  });

  it('returns err on malformed response shape', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(
      axiosOk<unknown>({ not_an_array: true }) as AxiosResponse<SuggestionGroupDTO[]>,
    );

    const result = await listMappingSuggestions(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_RESPONSE');
    }
  });

  it('returns err on 500 server error with server message', async () => {
    const client = createMockClient();
    const axiosError = new AxiosError('Server error', 'ERR_BAD_RESPONSE');
    axiosError.response = {
      data: { message: 'Database down' },
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    client.get.mockRejectedValue(axiosError);

    const result = await listMappingSuggestions(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_500');
      expect(result.error.message).toBe('Database down');
    }
  });
});
