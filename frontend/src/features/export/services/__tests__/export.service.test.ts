import {
  flattenMappings,
  exportMappings,
  exportMappingsAsCSV,
} from '@/features/export/services/export.service';
import type { HttpClient } from '@/shared/services/http/http.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMockClient(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

// ─── flattenMappings ────────────────────────────────────────────────────────

describe('flattenMappings', () => {
  it('builds correct MappingExportItem[] from multiple groups with multiple accounts', () => {
    const groups = [
      {
        source_type: 'Asset',
        target_type: 'Fixed Asset',
        confidence: 92,
        accounts: [
          { source_name: 'Cash', target_name: 'Cash & Equivalents' },
          { source_name: 'AR', target_name: 'Accounts Receivable' },
        ],
      },
      {
        source_type: 'Liability',
        target_type: 'Current Liability',
        confidence: 78,
        accounts: [
          { source_name: 'AP', target_name: 'Accounts Payable' },
        ],
      },
    ] as const;

    const result = flattenMappings(groups);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      source_field: 'Cash',
      target_field: 'Cash & Equivalents',
      source_type: 'Asset',
      target_type: 'Fixed Asset',
      confidence: 92,
      method: 'hierarchical',
    });
    expect(result[1]).toEqual({
      source_field: 'AR',
      target_field: 'Accounts Receivable',
      source_type: 'Asset',
      target_type: 'Fixed Asset',
      confidence: 92,
      method: 'hierarchical',
    });
    expect(result[2]).toEqual({
      source_field: 'AP',
      target_field: 'Accounts Payable',
      source_type: 'Liability',
      target_type: 'Current Liability',
      confidence: 78,
      method: 'hierarchical',
    });
  });

  it('returns empty array for empty groups', () => {
    const result = flattenMappings([]);
    expect(result).toEqual([]);
  });

  it('skips groups with no accounts', () => {
    const groups = [
      {
        source_type: 'Equity',
        target_type: 'Owner Equity',
        confidence: 85,
        accounts: [],
      },
      {
        source_type: 'Revenue',
        target_type: 'Income',
        confidence: 90,
        accounts: [{ source_name: 'Sales', target_name: 'Sales Revenue' }],
      },
    ] as const;

    const result = flattenMappings(groups);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      source_field: 'Sales',
      target_field: 'Sales Revenue',
      source_type: 'Revenue',
      target_type: 'Income',
      confidence: 90,
      method: 'hierarchical',
    });
  });
});

// ─── exportMappings ─────────────────────────────────────────────────────────

describe('exportMappings', () => {
  const projectId = 'proj-123';
  const items = [
    {
      source_field: 'Cash',
      target_field: 'Cash & Equivalents',
      source_type: 'Asset',
      target_type: 'Fixed Asset',
      confidence: 92,
      method: 'hierarchical',
    },
  ] as const;

  it('calls correct endpoint with correct payload', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      data: new ArrayBuffer(8),
    });
    const client = createMockClient({ post: mockPost });

    await exportMappings(client, projectId, items);

    expect(mockPost).toHaveBeenCalledWith(
      `/api/v1/mappings/project/${projectId}/export`,
      { mappings: items },
      { responseType: 'blob' },
    );
  });

  it('returns ok result with blob, filename, and excel format', async () => {
    const mockPost = jest.fn().mockResolvedValue({
      data: new ArrayBuffer(8),
    });
    const client = createMockClient({ post: mockPost });

    const result = await exportMappings(client, projectId, items);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.blob).toBeInstanceOf(Blob);
      expect(result.data.filename).toBe(`mapped_coa_${projectId}.xlsx`);
      expect(result.data.format).toBe('excel');
    }
  });

  it('wraps error in Result.err on failure', async () => {
    const networkError = new Error('Network failure');
    const mockPost = jest.fn().mockRejectedValue(networkError);
    const client = createMockClient({ post: mockPost });

    const result = await exportMappings(client, projectId, items);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(
        expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
      );
    }
  });
});

// ─── exportMappingsAsCSV ────────────────────────────────────────────────────

describe('exportMappingsAsCSV', () => {
  const projectId = 'proj-456';
  const items = [
    {
      source_field: 'Cash',
      target_field: 'Cash & Equivalents',
      source_type: 'Asset',
      target_type: 'Fixed Asset',
      confidence: 92,
      method: 'hierarchical',
    },
    {
      source_field: 'AP',
      target_field: 'Accounts Payable',
      source_type: 'Liability',
      target_type: 'Current Liability',
      confidence: 78,
      method: 'hierarchical',
    },
  ] as const;

  it('generates CSV content with correct headers and rows', () => {
    const result = exportMappingsAsCSV(items, projectId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.blob).toBeInstanceOf(Blob);
      expect(result.data.blob.size).toBeGreaterThan(0);
      expect(result.data.blob.type).toBe('text/csv');
    }
  });

  it('returns correct filename format', () => {
    const result = exportMappingsAsCSV(items, projectId);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.filename).toBe(`mapped_coa_${projectId}.csv`);
      expect(result.data.format).toBe('csv');
    }
  });
});
