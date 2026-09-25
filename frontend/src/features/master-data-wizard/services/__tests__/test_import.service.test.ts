import { triggerTestImport, getTestRun } from '../test_import.service';
import type { HttpClient } from '@/shared/services/http/http.types';

/** A fully-formed complete TestRunDto, as either endpoint returns it on success. */
const VALID_RUN = {
  id: 'run-123',
  run_id: 'pipeline-456',
  status: 'complete' as const,
  rows_attempted: 100,
  rows_passed: 90,
  rows_failed: 10,
  failure_summary: { CustomerID: { required_missing: 5 } },
  sample_failures: [{ row_index: 3, field: 'CustomerID', value: null, reason: 'required_missing' }],
  error_detail: null,
  created_at: '2024-01-01T00:00:00Z',
  started_at: '2024-01-01T00:00:01Z',
  completed_at: '2024-01-01T00:01:00Z',
};

describe('test_import.service', () => {
  describe('triggerTestImport', () => {
    it('parses a valid 200 response into an ok TestRunDto and POSTs the real path', async () => {
      const post = jest.fn(async () => ({ data: VALID_RUN }));
      const client = { post } as unknown as HttpClient;

      const result = await triggerTestImport(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual(VALID_RUN);
      expect(post).toHaveBeenCalledWith('/api/v1/pipeline/runs/pipeline-456/test', {});
    });

    it('wraps a network error via toAppError instead of throwing', async () => {
      const post = jest.fn(async () => {
        throw new Error('network down');
      });
      const client = { post } as unknown as HttpClient;

      const result = await triggerTestImport(client, 'pipeline-456');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });

    it('returns INVALID_RESPONSE when the payload fails schema validation (missing id)', async () => {
      const { id: _omit, ...withoutId } = VALID_RUN;
      const post = jest.fn(async () => ({ data: withoutId }));
      const client = { post } as unknown as HttpClient;

      const result = await triggerTestImport(client, 'pipeline-456');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('getTestRun', () => {
    it('parses a valid 200 response into an ok TestRunDto and GETs the real path', async () => {
      const get = jest.fn(async () => ({ data: VALID_RUN }));
      const client = { get } as unknown as HttpClient;

      const result = await getTestRun(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual(VALID_RUN);
      expect(get).toHaveBeenCalledWith('/api/v1/pipeline/runs/pipeline-456/test');
    });

    it('wraps a network error via toAppError instead of throwing', async () => {
      const get = jest.fn(async () => {
        throw new Error('network down');
      });
      const client = { get } as unknown as HttpClient;

      const result = await getTestRun(client, 'pipeline-456');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });
  });
});
