import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import {
  bulkSaveAccountTypeMappings,
  clearAccountTypeMappings,
  fromAccountTypeDTOs,
  listAccountTypeMappings,
  toAccountTypePairs,
} from '@/features/migration/services/account-type.service';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';
import type {
  AccountTypeMappingBulkResponseDTO,
  AccountTypeMappingResponseDTO,
} from '@/features/migration/types/account-type.types';

// ─── Mock HTTP Client ──────────────────────────────────────────────────────

function createMockClient(): jest.Mocked<
  Pick<AxiosInstance, 'get' | 'post' | 'delete'>
> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };
}

function makeAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function makeDTO(
  overrides: Partial<AccountTypeMappingResponseDTO> = {},
): AccountTypeMappingResponseDTO {
  return {
    id: 'atm-1',
    project_id: 'proj-1',
    source_account_type: 'Asset',
    target_account_type: 'Fixed Asset',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── toAccountTypePairs (fan-out) ──────────────────────────────────────────

describe('toAccountTypePairs', () => {
  it('fans a row with 3 targets into 3 flat DTO pairs', () => {
    const rows: readonly TypeMappingRow[] = [
      {
        id: 'r1',
        sourceType: 'Asset',
        targetTypes: ['Fixed Asset', 'Current Asset', 'Other Asset'],
        isCustom: false,
      },
    ];

    const result = toAccountTypePairs(rows);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { source_account_type: 'Asset', target_account_type: 'Fixed Asset' },
      { source_account_type: 'Asset', target_account_type: 'Current Asset' },
      { source_account_type: 'Asset', target_account_type: 'Other Asset' },
    ]);
  });

  it('skips rows with blank source type', () => {
    const rows: readonly TypeMappingRow[] = [
      {
        id: 'r1',
        sourceType: '   ',
        targetTypes: ['X'],
        isCustom: true,
      },
    ];
    expect(toAccountTypePairs(rows)).toEqual([]);
  });

  it('skips rows with no targets', () => {
    const rows: readonly TypeMappingRow[] = [
      { id: 'r1', sourceType: 'Asset', targetTypes: [], isCustom: false },
    ];
    expect(toAccountTypePairs(rows)).toEqual([]);
  });

  it('trims whitespace and skips empty target entries', () => {
    const rows: readonly TypeMappingRow[] = [
      {
        id: 'r1',
        sourceType: 'Asset',
        targetTypes: [' Fixed Asset ', '', '   '],
        isCustom: false,
      },
    ];

    expect(toAccountTypePairs(rows)).toEqual([
      { source_account_type: 'Asset', target_account_type: 'Fixed Asset' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(toAccountTypePairs([])).toEqual([]);
  });
});

// ─── fromAccountTypeDTOs (group-on-load) ───────────────────────────────────

describe('fromAccountTypeDTOs', () => {
  it('groups 3 flat DTO rows with the same source into 1 row with 3 targets in order', () => {
    const dtos: AccountTypeMappingResponseDTO[] = [
      makeDTO({ id: '1', source_account_type: 'Asset', target_account_type: 'Fixed Asset' }),
      makeDTO({ id: '2', source_account_type: 'Asset', target_account_type: 'Current Asset' }),
      makeDTO({ id: '3', source_account_type: 'Asset', target_account_type: 'Other Asset' }),
    ];

    const rows = fromAccountTypeDTOs(dtos);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceType).toBe('Asset');
    expect(rows[0]?.targetTypes).toEqual(['Fixed Asset', 'Current Asset', 'Other Asset']);
  });

  it('preserves first-seen source order across groups', () => {
    const dtos: AccountTypeMappingResponseDTO[] = [
      makeDTO({ source_account_type: 'Liability', target_account_type: 'Current Liability' }),
      makeDTO({ source_account_type: 'Asset', target_account_type: 'Fixed Asset' }),
      makeDTO({ source_account_type: 'Liability', target_account_type: 'Long-Term Liability' }),
    ];

    const rows = fromAccountTypeDTOs(dtos);

    expect(rows.map((r) => r.sourceType)).toEqual(['Liability', 'Asset']);
    expect(rows[0]?.targetTypes).toEqual([
      'Current Liability',
      'Long-Term Liability',
    ]);
    expect(rows[1]?.targetTypes).toEqual(['Fixed Asset']);
  });

  it('deduplicates identical target entries within a source group', () => {
    const dtos: AccountTypeMappingResponseDTO[] = [
      makeDTO({ source_account_type: 'Asset', target_account_type: 'Fixed Asset' }),
      makeDTO({ source_account_type: 'Asset', target_account_type: 'Fixed Asset' }),
    ];

    const rows = fromAccountTypeDTOs(dtos);
    expect(rows[0]?.targetTypes).toEqual(['Fixed Asset']);
  });

  it('skips inactive rows', () => {
    const dtos: AccountTypeMappingResponseDTO[] = [
      makeDTO({ source_account_type: 'Asset', is_active: false }),
    ];
    expect(fromAccountTypeDTOs(dtos)).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(fromAccountTypeDTOs([])).toEqual([]);
  });

  it('generates stable slug-based ids from source type', () => {
    const dtos: AccountTypeMappingResponseDTO[] = [
      makeDTO({ source_account_type: 'Current Asset' }),
    ];
    const rows = fromAccountTypeDTOs(dtos);
    expect(rows[0]?.id).toBe('current-asset');
  });
});

// ─── bulkSaveAccountTypeMappings ───────────────────────────────────────────

describe('bulkSaveAccountTypeMappings', () => {
  it('fans out multi-target rows into N pairs and POSTs to the project endpoint', async () => {
    const client = createMockClient();
    const response: AccountTypeMappingBulkResponseDTO = {
      success: true,
      count: 3,
      project_id: 'proj-1',
    };
    client.post.mockResolvedValue(makeAxiosResponse(response));

    const rows: readonly TypeMappingRow[] = [
      {
        id: 'r1',
        sourceType: 'Asset',
        targetTypes: ['Fixed Asset', 'Current Asset'],
        isCustom: false,
      },
      {
        id: 'r2',
        sourceType: 'Liability',
        targetTypes: ['Current Liability'],
        isCustom: false,
      },
    ];

    const result = await bulkSaveAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
      rows,
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/account-type-mappings',
      {
        type_mappings: [
          { source_account_type: 'Asset', target_account_type: 'Fixed Asset' },
          { source_account_type: 'Asset', target_account_type: 'Current Asset' },
          { source_account_type: 'Liability', target_account_type: 'Current Liability' },
        ],
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.count).toBe(3);
    }
  });

  it('includes mapping_file_id when provided', async () => {
    const client = createMockClient();
    client.post.mockResolvedValue(
      makeAxiosResponse<AccountTypeMappingBulkResponseDTO>({
        success: true,
        count: 1,
        project_id: 'proj-1',
      }),
    );

    const rows: readonly TypeMappingRow[] = [
      { id: 'r1', sourceType: 'Asset', targetTypes: ['Fixed Asset'], isCustom: false },
    ];

    await bulkSaveAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
      rows,
      'file-42',
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/account-type-mappings',
      {
        type_mappings: [
          { source_account_type: 'Asset', target_account_type: 'Fixed Asset' },
        ],
        mapping_file_id: 'file-42',
      },
    );
  });

  it('handles empty input by sending an empty type_mappings array', async () => {
    const client = createMockClient();
    client.post.mockResolvedValue(
      makeAxiosResponse<AccountTypeMappingBulkResponseDTO>({
        success: true,
        count: 0,
        project_id: 'proj-1',
      }),
    );

    const result = await bulkSaveAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
      [],
    );

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/account-type-mappings',
      { type_mappings: [] },
    );
    expect(result.ok).toBe(true);
  });

  it('returns err result on server error', async () => {
    const client = createMockClient();
    const axiosError = new AxiosError('Server error', 'ERR_BAD_RESPONSE');
    axiosError.response = {
      data: { message: 'Permission denied' },
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    client.post.mockRejectedValue(axiosError);

    const result = await bulkSaveAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_403');
      expect(result.error.message).toBe('Permission denied');
    }
  });
});

// ─── listAccountTypeMappings ───────────────────────────────────────────────

describe('listAccountTypeMappings', () => {
  it('GETs the project endpoint and groups the response by source type', async () => {
    const client = createMockClient();
    const dtos: AccountTypeMappingResponseDTO[] = [
      makeDTO({ source_account_type: 'Asset', target_account_type: 'Fixed Asset' }),
      makeDTO({ source_account_type: 'Asset', target_account_type: 'Current Asset' }),
      makeDTO({ source_account_type: 'Liability', target_account_type: 'Current Liability' }),
    ];
    client.get.mockResolvedValue(makeAxiosResponse(dtos));

    const result = await listAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/account-type-mappings',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.sourceType).toBe('Asset');
      expect(result.data[0]?.targetTypes).toEqual(['Fixed Asset', 'Current Asset']);
      expect(result.data[1]?.sourceType).toBe('Liability');
    }
  });

  it('returns ok with empty array when backend sends empty list', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(makeAxiosResponse<AccountTypeMappingResponseDTO[]>([]));

    const result = await listAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it('returns err result on network failure', async () => {
    const client = createMockClient();
    const axiosError = new AxiosError('Network timeout', 'ECONNABORTED');
    client.get.mockRejectedValue(axiosError);

    const result = await listAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_0');
      expect(result.error.message).toBe('Network timeout');
    }
  });

  it('returns err on malformed response shape', async () => {
    const client = createMockClient();
    client.get.mockResolvedValue(
      makeAxiosResponse({ not_an_array: true } as unknown as AccountTypeMappingResponseDTO[]),
    );

    const result = await listAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_RESPONSE');
    }
  });
});

// ─── clearAccountTypeMappings ──────────────────────────────────────────────

describe('clearAccountTypeMappings', () => {
  it('DELETEs the project endpoint and returns ok', async () => {
    const client = createMockClient();
    client.delete.mockResolvedValue(makeAxiosResponse(undefined, 204));

    const result = await clearAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/mappings/project/proj-1/account-type-mappings',
    );
    expect(result.ok).toBe(true);
  });

  it('returns err result on server error', async () => {
    const client = createMockClient();
    const axiosError = new AxiosError('Server error', 'ERR_BAD_RESPONSE');
    axiosError.response = {
      data: { message: 'Project not found' },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    client.delete.mockRejectedValue(axiosError);

    const result = await clearAccountTypeMappings(
      client as unknown as AxiosInstance,
      'proj-1',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_404');
      expect(result.error.message).toBe('Project not found');
    }
  });
});
