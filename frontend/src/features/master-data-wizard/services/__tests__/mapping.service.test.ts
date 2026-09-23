import { getColumnMappings, getTargetFields, bulkAcceptColumnMappings, bookmarkMapping, unbookmarkMapping } from '../mapping.service';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { BulkAcceptField } from '../../types/decision.types';

/** Routes by URL suffix so mappings and target-fields can be mocked independently. */
function mockClient(handlers: {
  mappings?: () => Promise<{ data: unknown }>;
  targetFields?: () => Promise<{ data: unknown }>;
}): HttpClient {
  const get = jest.fn((url: string) => {
    if (url.endsWith('/target-fields')) {
      return (handlers.targetFields ?? (() => Promise.reject(new Error('no target-fields handler'))))();
    }
    return (handlers.mappings ?? (() => Promise.reject(new Error('no mappings handler'))))();
  });
  return { get } as unknown as HttpClient;
}

const VALID_RESPONSE = {
  summary: { total: 2, high_confidence: 1, needs_review: 0, no_safe_target: 1, missing_required_targets: 0, excluded: 0 },
  mappings: [
    {
      id: 'f1',
      source_field: 'Name',
      target_field_id: 'default_code',
      target_field_label: 'Internal Reference',
      target_dtype: 'Char',
      status: 'suggested',
      confidence: 0.96,
      validation: 'compatible',
      evidence: ['name', 'samples'],
      is_bookmarked: true,
    },
    {
      id: 'f2',
      source_field: 'Notes',
      target_field_id: null,
      target_field_label: null,
      target_dtype: null,
      status: 'no_safe_target',
      confidence: null,
      validation: null,
      evidence: null,
      is_bookmarked: false,
    },
  ],
};

const VALID_TARGET_FIELDS_RESPONSE = {
  erp_id: 'odoo',
  scope: 'items',
  fields: [
    { field_id: 'default_code', label: 'Internal Reference', dtype: 'Char', relation: null, required: false, read_only: false, identifier: false, source: 'seed' },
    // Not referenced by any mapping row — only present because it's the real catalogue, not row-derived.
    { field_id: 'categ_id', label: 'Product Category', dtype: 'Many2one', relation: 'product.category', required: true, read_only: false, identifier: false, source: 'seed' },
    { field_id: 'barcode', label: 'Barcode', dtype: 'Char', relation: null, required: false, read_only: true, identifier: true, source: 'seed' },
  ],
};

describe('mapping.service', () => {
  describe('getColumnMappings', () => {
    it('maps a valid response into EntityMapping, converting confidence 0-1 -> 0-100', async () => {
      const client = mockClient({
        mappings: async () => ({ data: VALID_RESPONSE }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const mapping = result.data.mapping;

      expect(mapping.proposals).toHaveLength(2);
      const row = mapping.proposals!.find((p: { id: string }) => p.id === 'f1')!;
      expect(row.name).toBe('Name');
      expect(row.conf).toBe(96);
      expect(row.status).toBe('Suggested');
      expect(row.validation).toBe('Compatible');
    });

    it('every row has a source_field, so nothing routes into missingTargets', async () => {
      const client = mockClient({
        mappings: async () => ({ data: VALID_RESPONSE }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.mapping.missingTargets).toEqual([]);
    });

    it('maps no_safe_target status to the Blocked taxonomy value, with no proposed target', async () => {
      const client = mockClient({
        mappings: async () => ({ data: VALID_RESPONSE }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const row = result.data.mapping.proposals!.find((p: { id: string }) => p.id === 'f2')!;
      expect(row.status).toBe('Blocked');
      expect(row.targetId).toBeUndefined();
    });

    it('uses the real target-fields catalogue, including targets no row references yet', async () => {
      const client = mockClient({
        mappings: async () => ({ data: VALID_RESPONSE }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.mapping.targetFields).toHaveLength(3);
      const categ = result.data.mapping.targetFields!.find((t: { id: string }) => t.id === 'categ_id')!;
      expect(categ).toEqual({ id: 'categ_id', label: 'Product Category', dtype: 'Many2one', required: true, identifier: false, writable: true });
      const barcode = result.data.mapping.targetFields!.find((t: { id: string }) => t.id === 'barcode')!;
      expect(barcode.writable).toBe(false); // read_only: true
    });

    it('falls back to the row-derived target set when the target-fields call fails', async () => {
      const client = mockClient({
        mappings: async () => ({ data: VALID_RESPONSE }),
        targetFields: async () => {
          throw new Error('target-fields down');
        },
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.mapping.targetFields).toEqual([{ id: 'default_code', label: 'Internal Reference', dtype: 'Char' }]);
    });

    it('returns INVALID_RESPONSE when the mappings payload fails schema validation', async () => {
      const client = mockClient({
        mappings: async () => ({ data: { not: 'valid' } }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_RESPONSE');
    });

    it('wraps a mappings network error via toAppError instead of throwing', async () => {
      const client = mockClient({
        mappings: async () => {
          throw new Error('network down');
        },
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });

    it('derives bookmarkedIds from rows where is_bookmarked is true', async () => {
      const client = mockClient({
        mappings: async () => ({ data: VALID_RESPONSE }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.bookmarkedIds).toEqual(new Set(['f1']));
    });

    it('defaults is_bookmarked to false when the backend omits it', async () => {
      const { is_bookmarked: _omit, ...rowWithoutFlag } = VALID_RESPONSE.mappings[0]!;
      const client = mockClient({
        mappings: async () => ({ data: { ...VALID_RESPONSE, mappings: [rowWithoutFlag, VALID_RESPONSE.mappings[1]] } }),
        targetFields: async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }),
      });
      const result = await getColumnMappings(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.bookmarkedIds).toEqual(new Set());
    });

    it('calls both real paths with erp_id defaulting to odoo', async () => {
      const get = jest.fn((url: string) =>
        url.endsWith('/target-fields') ? Promise.resolve({ data: VALID_TARGET_FIELDS_RESPONSE }) : Promise.resolve({ data: VALID_RESPONSE }),
      );
      const client = { get } as unknown as HttpClient;

      await getColumnMappings(client, 'run-1');

      expect(get).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1/mappings', { params: { erp_id: 'odoo' } });
      expect(get).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1/target-fields', { params: { erp_id: 'odoo' } });
    });
  });

  describe('getTargetFields', () => {
    it('maps field_id/label/dtype/required/identifier, and read_only into writable', async () => {
      const get = jest.fn(async () => ({ data: VALID_TARGET_FIELDS_RESPONSE }));
      const client = { get } as unknown as HttpClient;

      const result = await getTargetFields(client, 'run-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({ id: 'default_code', label: 'Internal Reference', dtype: 'Char', required: false, identifier: false, writable: true });
    });

    it('returns INVALID_RESPONSE when the payload fails schema validation', async () => {
      const get = jest.fn(async () => ({ data: { not: 'valid' } }));
      const client = { get } as unknown as HttpClient;

      const result = await getTargetFields(client, 'run-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_RESPONSE');
    });

    it('wraps a network error via toAppError instead of throwing', async () => {
      const get = jest.fn(async () => {
        throw new Error('network down');
      });
      const client = { get } as unknown as HttpClient;

      const result = await getTargetFields(client, 'run-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });
  });

  describe('bulkAcceptColumnMappings', () => {
    const FIELD: BulkAcceptField = {
      fieldId: 'f1',
      sourceField: 'Name',
      targetFieldId: 'default_code',
      targetFieldLabel: 'Internal Reference',
      targetDtype: 'Char',
      confidence: 96,
      validation: 'Compatible',
      evidence: ['name', 'samples'],
    };

    it('PUTs the real path with status: confirmed and the reverse-mapped wire shape', async () => {
      const put = jest.fn(async () => ({ data: {} }));
      const client = { put } as unknown as HttpClient;

      await bulkAcceptColumnMappings(client, 'run-1', [FIELD]);

      expect(put).toHaveBeenCalledWith(
        '/api/v1/pipeline/runs/run-1/mappings',
        {
          mappings: [
            {
              source_field: 'Name',
              target_field_id: 'default_code',
              target_field_label: 'Internal Reference',
              target_dtype: 'Char',
              status: 'confirmed',
              confidence: 0.96,
              validation: 'compatible',
              evidence: ['name', 'samples'],
            },
          ],
        },
        { params: { erp_id: 'odoo' } },
      );
    });

    it('reverse-maps "Blocked" validation back to "incompatible", and omits an unscored/unvalidated field as null', async () => {
      const put = jest.fn(async (..._args: unknown[]) => ({ data: {} }));
      const client = { put } as unknown as HttpClient;

      await bulkAcceptColumnMappings(client, 'run-1', [
        { ...FIELD, validation: 'Blocked', confidence: undefined, evidence: undefined },
      ]);

      const body = put.mock.calls[0]?.[1] as { mappings: Array<Record<string, unknown>> };
      expect(body.mappings[0]?.validation).toBe('incompatible');
      expect(body.mappings[0]?.confidence).toBeNull();
      expect(body.mappings[0]?.evidence).toBeNull();
    });

    it('returns ok(undefined) on success', async () => {
      const put = jest.fn(async () => ({ data: {} }));
      const client = { put } as unknown as HttpClient;

      const result = await bulkAcceptColumnMappings(client, 'run-1', [FIELD]);

      expect(result).toEqual({ ok: true, data: undefined });
    });

    it('wraps a network error via toAppError instead of throwing', async () => {
      const put = jest.fn(async () => {
        throw new Error('network down');
      });
      const client = { put } as unknown as HttpClient;

      const result = await bulkAcceptColumnMappings(client, 'run-1', [FIELD]);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });
  });

  describe('bookmarkMapping / unbookmarkMapping', () => {
    it('POSTs the real bookmark path', async () => {
      const post = jest.fn(async () => ({ data: {} }));
      const client = { post } as unknown as HttpClient;

      const result = await bookmarkMapping(client, 'run-1', 'f1');

      expect(result).toEqual({ ok: true, data: undefined });
      expect(post).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1/mappings/f1/bookmark', {});
    });

    it('DELETEs the real bookmark path', async () => {
      const del = jest.fn(async () => ({ data: {} }));
      const client = { delete: del } as unknown as HttpClient;

      const result = await unbookmarkMapping(client, 'run-1', 'f1');

      expect(result).toEqual({ ok: true, data: undefined });
      expect(del).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1/mappings/f1/bookmark');
    });

    it('wraps a network error via toAppError instead of throwing', async () => {
      const post = jest.fn(async () => {
        throw new Error('network down');
      });
      const client = { post } as unknown as HttpClient;

      const result = await bookmarkMapping(client, 'run-1', 'f1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });
  });
});
