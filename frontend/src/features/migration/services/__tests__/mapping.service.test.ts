import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { AppError } from '@/shared/types/result.types';
import type {
  GroupedMapping,
  HierarchicalMappingResponse,
  BulkSaveResponseDTO,
  MappingCreateDTO,
  MappingResponseDTO,
} from '@/features/migration/types/mapping.types';
import type { TypeMappingRow } from '@/features/migration/types/migration.types';
import {
  buildCustomTypeMappings,
  applyCustomTypeMappings,
  toMappingCreateDTOs,
  getHierarchicalMapping,
  saveMappings,
  getMappings,
} from '@/features/migration/services/mapping.service';

// ─── Mock HTTP Client ──────────────────────────────────────────────────────

function createMockClient(): jest.Mocked<Pick<AxiosInstance, 'get' | 'post'>> {
  return {
    get: jest.fn(),
    post: jest.fn(),
  };
}

// ─── Test Factories ────────────────────────────────────────────────────────

interface TypeMappingRowFactoryInput {
  readonly id?: string;
  readonly sourceType?: string;
  readonly targetType?: string;
  readonly targetTypes?: readonly string[];
  readonly isCustom?: boolean;
}

function makeTypeMappingRow(overrides: TypeMappingRowFactoryInput = {}): TypeMappingRow {
  const { targetType, targetTypes, ...rest } = overrides;
  const resolvedTargets =
    targetTypes ?? (targetType !== undefined ? (targetType.length > 0 ? [targetType] : []) : ['Fixed Asset']);
  return {
    id: 'row-1',
    sourceType: 'Asset',
    targetTypes: resolvedTargets,
    isCustom: true,
    ...rest,
  };
}

function makeGroupedMapping(overrides: Partial<GroupedMapping> = {}): GroupedMapping {
  return {
    source_type: 'Asset',
    target_type: 'Assets',
    confidence: 85,
    accounts: [
      {
        source_number: '1000',
        source_name: 'Cash',
        target_name: 'Cash and Equivalents',
        score: 92,
        remark: 'High confidence match',
      },
    ],
    ...overrides,
  };
}

function makeHierarchicalResponse(
  overrides: Partial<HierarchicalMappingResponse> = {},
): HierarchicalMappingResponse {
  return {
    job_id: 'job-001',
    project_id: 'proj-001',
    status: 'pending',
    ...overrides,
  };
}

function makeMappingResponseDTO(
  overrides: Partial<MappingResponseDTO> = {},
): MappingResponseDTO {
  return {
    id: 'mapping-1',
    project_id: 'proj-1',
    source_account_name: 'Cash',
    target_account_name: 'Cash and Equivalents',
    confidence_score: 92,
    status: 'confirmed',
    source_type: 'Asset',
    target_type: 'Fixed Asset',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

// ─── buildCustomTypeMappings ───────────────────────────────────────────────

describe('buildCustomTypeMappings', () => {
  it('builds a record from rows with both sourceType and targetType', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({ id: '1', sourceType: 'Asset', targetType: 'Fixed Asset' }),
      makeTypeMappingRow({ id: '2', sourceType: 'Liability', targetType: 'Current Liability' }),
    ];

    const result = buildCustomTypeMappings(rows);

    expect(result).toEqual({
      Asset: 'Fixed Asset',
      Liability: 'Current Liability',
    });
  });

  it('returns an empty record when given an empty array', () => {
    const result = buildCustomTypeMappings([]);
    expect(result).toEqual({});
  });

  it('skips rows with blank sourceType', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({ sourceType: '', targetType: 'Fixed Asset' }),
    ];

    const result = buildCustomTypeMappings(rows);
    expect(result).toEqual({});
  });

  it('skips rows with blank targetType', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({ sourceType: 'Asset', targetType: '' }),
    ];

    const result = buildCustomTypeMappings(rows);
    expect(result).toEqual({});
  });

  it('skips rows where both sourceType and targetType are blank', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({ sourceType: '', targetType: '' }),
    ];

    const result = buildCustomTypeMappings(rows);
    expect(result).toEqual({});
  });

  it('uses last value when duplicate sourceTypes exist', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({ id: '1', sourceType: 'Asset', targetType: 'First' }),
      makeTypeMappingRow({ id: '2', sourceType: 'Asset', targetType: 'Second' }),
    ];

    const result = buildCustomTypeMappings(rows);
    expect(result).toEqual({ Asset: 'Second' });
  });

  it('flattens multi-target rows to the first target (hierarchical endpoint is single-target)', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({
        id: 'multi',
        sourceType: 'Asset',
        targetTypes: ['Primary Asset', 'Secondary Asset', 'Tertiary Asset'],
      }),
    ];

    const result = buildCustomTypeMappings(rows);
    expect(result).toEqual({ Asset: 'Primary Asset' });
  });

  it('skips multi-target rows with an empty first entry', () => {
    const rows: readonly TypeMappingRow[] = [
      makeTypeMappingRow({ sourceType: 'Asset', targetTypes: [] }),
    ];

    const result = buildCustomTypeMappings(rows);
    expect(result).toEqual({});
  });
});

// ─── applyCustomTypeMappings ───────────────────────────────────────────────

describe('applyCustomTypeMappings', () => {
  it('overrides target_type and sets confidence to 100 for matching groups', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Asset', target_type: 'Assets', confidence: 75 }),
    ];
    const overrides = { Asset: 'Fixed Asset' };

    const result = applyCustomTypeMappings(groups, overrides);

    expect(result).toHaveLength(1);
    expect(result[0]?.target_type).toBe('Fixed Asset');
    expect(result[0]?.confidence).toBe(100);
  });

  it('preserves groups with no matching override', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Revenue', target_type: 'Income', confidence: 80 }),
    ];
    const overrides = { Asset: 'Fixed Asset' };

    const result = applyCustomTypeMappings(groups, overrides);

    expect(result).toHaveLength(1);
    expect(result[0]?.target_type).toBe('Income');
    expect(result[0]?.confidence).toBe(80);
  });

  it('returns an empty array when given empty groups', () => {
    const result = applyCustomTypeMappings([], { Asset: 'Fixed Asset' });
    expect(result).toEqual([]);
  });

  it('returns groups unchanged when overrides record is empty', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Asset', confidence: 70 }),
    ];

    const result = applyCustomTypeMappings(groups, {});

    expect(result[0]?.confidence).toBe(70);
  });

  it('preserves accounts array on overridden groups', () => {
    const accounts = [
      {
        source_number: '1000',
        source_name: 'Cash',
        target_name: 'Cash Equiv',
        score: 95,
        remark: 'match',
      },
      {
        source_number: '1100',
        source_name: 'AR',
        target_name: 'Accounts Recv',
        score: 88,
        remark: 'close match',
      },
    ];
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Asset', accounts }),
    ];

    const result = applyCustomTypeMappings(groups, { Asset: 'Fixed Asset' });

    expect(result[0]?.accounts).toEqual(accounts);
  });

  it('applies overrides to multiple groups independently', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Asset', target_type: 'A', confidence: 60 }),
      makeGroupedMapping({ source_type: 'Liability', target_type: 'L', confidence: 70 }),
      makeGroupedMapping({ source_type: 'Equity', target_type: 'E', confidence: 80 }),
    ];
    const overrides = { Asset: 'Fixed Asset', Equity: 'Owner Equity' };

    const result = applyCustomTypeMappings(groups, overrides);

    expect(result[0]?.target_type).toBe('Fixed Asset');
    expect(result[0]?.confidence).toBe(100);
    expect(result[1]?.target_type).toBe('L');
    expect(result[1]?.confidence).toBe(70);
    expect(result[2]?.target_type).toBe('Owner Equity');
    expect(result[2]?.confidence).toBe(100);
  });
});

// ─── toMappingCreateDTOs ──────────────────────────────────────────────────

describe('toMappingCreateDTOs', () => {
  it('maps source_type to source_account_type for backend compatibility', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Asset', target_type: 'Fixed Asset' }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result[0]?.source_account_type).toBe('Asset');
    expect(result[0]?.target_account_type).toBe('Fixed Asset');
    expect((result[0] as unknown as Record<string, unknown>)['source_type']).toBeUndefined();
    expect((result[0] as unknown as Record<string, unknown>)['target_type']).toBeUndefined();
  });

  it('emits confidence_score on UPDATE rows (id + user_changed)', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            id: 'm-1',
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv (edited)',
            score: 45,
            remark: '',
            user_changed: true,
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('m-1');
    expect(result[0]?.confidence_score).toBe(45);
    expect(result[0]?.target_account_name).toBe('Cash Equiv (edited)');
  });

  it('skips UPDATE rows that were not edited by the user', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            id: 'm-1',
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv',
            score: 95,
            remark: '',
            // user_changed intentionally omitted — row is untouched
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(0);
  });

  it('produces one DTO per account across all groups', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        source_type: 'Asset',
        target_type: 'Fixed Asset',
        accounts: [
          { source_number: '1000', source_name: 'Cash', target_name: 'Cash Equiv', score: 90, remark: '' },
          { source_number: '1001', source_name: 'AR', target_name: 'Receivable', score: 80, remark: '' },
        ],
      }),
      makeGroupedMapping({
        source_type: 'Liability',
        target_type: 'Current Liability',
        accounts: [
          { source_number: '2000', source_name: 'AP', target_name: 'Payable', score: 70, remark: '' },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(3);
    expect(result[2]?.source_account_type).toBe('Liability');
    expect(result[2]?.target_account_type).toBe('Current Liability');
  });

  it('never emits mapping_status from Save — status changes go through bulk-status', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv',
            score: 95,
            remark: '',
            status: 'confirmed', // present on the domain entity, must NOT propagate
          },
          {
            id: 'm-2',
            source_number: '1001',
            source_name: 'AR',
            target_name: 'AR edited',
            score: 55,
            remark: '',
            status: 'pending',
            user_changed: true,
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    for (const dto of result) {
      expect(dto.mapping_status).toBeUndefined();
    }
  });

  it('emits a minimal tombstone DTO for a deleted confirmed mapping (id + is_active:false)', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            id: 'm-1',
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv',
            score: 95,
            remark: '',
            is_active: false,
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      project_id: 'proj-1',
      id: 'm-1',
      is_active: false,
    });
  });

  it('emits a minimal tombstone DTO for a deleted suggestion (suggestion_id + is_active:false)', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            suggestion_id: 'sug-1',
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv',
            score: 90,
            remark: '',
            is_active: false,
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      project_id: 'proj-1',
      suggestion_id: 'sug-1',
      is_active: false,
    });
  });

  it('drops deletions of brand-new local rows that never reached the server', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv',
            score: 0,
            remark: '',
            is_active: false,
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(0);
  });

  it('never sets is_active on edit/insert DTOs (backend default = true)', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        accounts: [
          {
            id: 'm-1',
            source_name: 'Cash',
            source_number: '1000',
            target_name: 'Cash Equiv (edited)',
            score: 95,
            remark: '',
            user_changed: true,
          },
          {
            suggestion_id: 'sug-1',
            source_name: 'AR',
            source_number: '1100',
            target_name: 'Receivable',
            score: 88,
            remark: '',
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    for (const dto of result) {
      expect(dto.is_active).toBeUndefined();
    }
  });

  it('promotes a suggestion with suggestion_id but no id to an INSERT DTO', () => {
    const groups: readonly GroupedMapping[] = [
      makeGroupedMapping({
        source_type: 'Asset',
        target_type: 'Fixed Asset',
        accounts: [
          {
            suggestion_id: 'sug-1',
            source_number: '1000',
            source_name: 'Cash',
            target_name: 'Cash Equiv',
            score: 90,
            remark: '',
          },
        ],
      }),
    ];

    const result = toMappingCreateDTOs('proj-1', groups);

    expect(result).toHaveLength(1);
    expect(result[0]?.suggestion_id).toBe('sug-1');
    expect(result[0]?.id).toBeUndefined();
    expect(result[0]?.source_account_name).toBe('Cash');
    expect(result[0]?.target_account_name).toBe('Cash Equiv');
    expect(result[0]?.source_account_type).toBe('Asset');
    expect(result[0]?.target_account_type).toBe('Fixed Asset');
  });
});

// ─── getHierarchicalMapping ────────────────────────────────────────────────

describe('getHierarchicalMapping', () => {
  it('posts to /api/v1/mappings/hierarchical and returns ok result', async () => {
    const mockClient = createMockClient();
    const responseData = makeHierarchicalResponse();
    mockClient.post.mockResolvedValue(makeAxiosResponse(responseData));

    const result = await getHierarchicalMapping(
      mockClient as unknown as AxiosInstance,
      'proj-001',
      'src-file-001',
      'tgt-file-001',
    );

    expect(mockClient.post).toHaveBeenCalledWith('/api/v1/mappings/hierarchical', {
      project_id: 'proj-001',
      source_file_id: 'src-file-001',
      target_file_id: 'tgt-file-001',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(responseData);
    }
  });

  it('sends mapping_file_id when provided', async () => {
    const mockClient = createMockClient();
    mockClient.post.mockResolvedValue(makeAxiosResponse(makeHierarchicalResponse()));

    await getHierarchicalMapping(
      mockClient as unknown as AxiosInstance,
      'proj-001',
      'src-001',
      'tgt-001',
      'map-001',
    );

    expect(mockClient.post).toHaveBeenCalledWith('/api/v1/mappings/hierarchical', {
      project_id: 'proj-001',
      source_file_id: 'src-001',
      target_file_id: 'tgt-001',
      mapping_file_id: 'map-001',
    });
  });

  it('returns err result on network error', async () => {
    const mockClient = createMockClient();
    const axiosError = new AxiosError('Network error', 'ERR_NETWORK');
    mockClient.post.mockRejectedValue(axiosError);

    const result = await getHierarchicalMapping(
      mockClient as unknown as AxiosInstance,
      'proj-001',
      'src-001',
      'tgt-001',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_0');
      expect(result.error.message).toBe('Network error');
    }
  });

  it('returns err result with server message when available', async () => {
    const axiosError = new AxiosError('Request failed', 'ERR_BAD_REQUEST');
    axiosError.response = {
      data: { message: 'Invalid source data format' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };

    const mockClient = createMockClient();
    mockClient.post.mockRejectedValue(axiosError);

    const result = await getHierarchicalMapping(
      mockClient as unknown as AxiosInstance,
      'proj-001',
      'src-001',
      'tgt-001',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_400');
      expect(result.error.message).toBe('Invalid source data format');
    }
  });
});

// ─── saveMappings ──────────────────────────────────────────────────────────

describe('saveMappings', () => {
  it('posts to /api/v1/mappings/project/{projectId} and returns ok result', async () => {
    const mockClient = createMockClient();
    const responseData: BulkSaveResponseDTO = {
      success: true,
      mapping_count: 2,
      project_id: 'p-001',
      inserted: 1,
      updated: 1,
    };
    mockClient.post.mockResolvedValue(makeAxiosResponse(responseData));

    const mappings: MappingCreateDTO[] = [
      {
        project_id: 'proj-1',
        source_account_name: 'Cash',
        target_account_name: 'Cash and Equivalents',
        confidence_score: 92,
        mapping_status: 'confirmed',
      },
    ];

    const result = await saveMappings(
      mockClient as unknown as AxiosInstance,
      'p-001',
      mappings,
    );

    expect(mockClient.post).toHaveBeenCalledWith('/api/v1/mappings/project/p-001', mappings);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.inserted).toBe(1);
      expect(result.data.updated).toBe(1);
    }
  });

  it('returns err result on server error', async () => {
    const mockClient = createMockClient();
    const axiosError = new AxiosError('Server error', 'ERR_BAD_RESPONSE');
    axiosError.response = {
      data: { message: 'Internal server error' },
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    mockClient.post.mockRejectedValue(axiosError);

    const result = await saveMappings(
      mockClient as unknown as AxiosInstance,
      'p-001',
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_500');
      expect(result.error.message).toBe('Internal server error');
    }
  });

  it('wraps non-Axios errors as UNKNOWN_ERROR', async () => {
    const mockClient = createMockClient();
    mockClient.post.mockRejectedValue(new Error('Something broke'));

    const result = await saveMappings(
      mockClient as unknown as AxiosInstance,
      'p-001',
      [],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.error.message).toBe('Something broke');
    }
  });
});

// ─── getMappings ───────────────────────────────────────────────────────────

describe('getMappings', () => {
  it('fetches from /api/v1/mappings/project/{projectId}/effective and returns ok result', async () => {
    const mockClient = createMockClient();
    const responseData: GroupedMapping[] = [
      makeGroupedMapping({ source_type: 'Asset' }),
      makeGroupedMapping({ source_type: 'Liability' }),
    ];
    mockClient.get.mockResolvedValue(makeAxiosResponse(responseData));

    const result = await getMappings(
      mockClient as unknown as AxiosInstance,
      'proj-123',
    );

    expect(mockClient.get).toHaveBeenCalledWith('/api/v1/mappings/project/proj-123/effective');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.source_type).toBe('Asset');
      expect(result.data[1]?.source_type).toBe('Liability');
    }
  });

  it('returns ok with empty array on 404', async () => {
    const mockClient = createMockClient();
    const axiosError = new AxiosError('Not found', 'ERR_BAD_REQUEST');
    axiosError.response = {
      data: { message: 'Project not found' },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
    mockClient.get.mockRejectedValue(axiosError);

    const result = await getMappings(
      mockClient as unknown as AxiosInstance,
      'nonexistent',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it('returns err result on network failure', async () => {
    const mockClient = createMockClient();
    const axiosError = new AxiosError('timeout exceeded', 'ECONNABORTED');
    mockClient.get.mockRejectedValue(axiosError);

    const result = await getMappings(
      mockClient as unknown as AxiosInstance,
      'proj-123',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('HTTP_0');
      expect(result.error.message).toBe('timeout exceeded');
    }
  });

  it('wraps non-Error thrown values as UNKNOWN_ERROR', async () => {
    const mockClient = createMockClient();
    mockClient.get.mockRejectedValue('string error');

    const result = await getMappings(
      mockClient as unknown as AxiosInstance,
      'proj-123',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.error.message).toBe('An unexpected error occurred');
    }
  });
});
