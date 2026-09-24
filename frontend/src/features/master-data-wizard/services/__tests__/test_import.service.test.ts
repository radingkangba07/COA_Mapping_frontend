import { triggerImportRun, getImportRun, getImportRunBatches, getImportRunErrors, getImportRunRecords, getImportRunConnectorRequests } from '../test_import.service';
import type { HttpClient } from '@/shared/services/http/http.types';

const VALID_RUN = {
  id: 'ir-123',
  run_id: 'pipeline-456',
  status: 'complete' as const,
  run_code: 'run_ti_0001',
  batch_size: 20,
  req_per_sec: 4,
  rows_attempted: 100,
  rows_imported: 95,
  rows_failed: 3,
  rows_skipped: 2,
  rows_reconciled: 95,
  duration_ms: 58000,
  error_detail: null,
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T00:00:58Z',
  created_at: '2024-01-01T00:00:00Z',
};

describe('test_import.service', () => {
  describe('triggerImportRun', () => {
    it('POSTs the correct path and parses a valid ImportRunDto', async () => {
      const post = jest.fn(async () => ({ data: VALID_RUN }));
      const client = { post } as unknown as HttpClient;

      const result = await triggerImportRun(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.id).toBe('ir-123');
      expect(result.data.status).toBe('complete');
      expect(post).toHaveBeenCalledWith('/api/v1/pipeline/runs/pipeline-456/import-run', {});
    });

    it('wraps a network error via toAppError', async () => {
      const post = jest.fn(async () => { throw new Error('network down'); });
      const client = { post } as unknown as HttpClient;

      const result = await triggerImportRun(client, 'pipeline-456');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('network down');
    });

    it('returns INVALID_RESPONSE when schema validation fails', async () => {
      const { id: _omit, ...withoutId } = VALID_RUN;
      const post = jest.fn(async () => ({ data: withoutId }));
      const client = { post } as unknown as HttpClient;

      const result = await triggerImportRun(client, 'pipeline-456');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('getImportRun', () => {
    it('GETs the correct path and parses a valid ImportRunDto', async () => {
      const get = jest.fn(async () => ({ data: VALID_RUN }));
      const client = { get } as unknown as HttpClient;

      const result = await getImportRun(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data?.id).toBe('ir-123');
      expect(get).toHaveBeenCalledWith('/api/v1/pipeline/runs/pipeline-456/import-run');
    });

    it('returns ok(null) on 404 — no run yet is a valid idle state', async () => {
      const axiosError = Object.assign(new Error('Not Found'), {
        isAxiosError: true,
        response: { status: 404 },
      });
      const get = jest.fn(async () => { throw axiosError; });
      const client = { get } as unknown as HttpClient;

      const result = await getImportRun(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toBeNull();
    });

    it('wraps non-404 errors via toAppError', async () => {
      const get = jest.fn(async () => { throw new Error('timeout'); });
      const client = { get } as unknown as HttpClient;

      const result = await getImportRun(client, 'pipeline-456');

      expect(result.ok).toBe(false);
    });
  });

  describe('getImportRunBatches', () => {
    it('GETs batches and returns the batches array', async () => {
      const payload = {
        batches: [
          { batch_code: 'batch_01', records_total: 20, records_imported: 20, records_failed: 0, records_skipped: 0, errors_open: 0 },
        ],
      };
      const get = jest.fn(async () => ({ data: payload }));
      const client = { get } as unknown as HttpClient;

      const result = await getImportRunBatches(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.batch_code).toBe('batch_01');
      expect(get).toHaveBeenCalledWith('/api/v1/pipeline/runs/pipeline-456/import-run/batches');
    });
  });

  describe('getImportRunErrors', () => {
    it('GETs errors without params when no batch is specified', async () => {
      const payload = {
        errors: [],
        total: 0,
      };
      const get = jest.fn(async () => ({ data: payload }));
      const client = { get } as unknown as HttpClient;

      const result = await getImportRunErrors(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.total).toBe(0);
      expect(get).toHaveBeenCalledWith(
        '/api/v1/pipeline/runs/pipeline-456/import-run/errors',
        { params: {} },
      );
    });

    it('passes batch and status params when provided', async () => {
      const get = jest.fn(async () => ({ data: { errors: [], total: 0 } }));
      const client = { get } as unknown as HttpClient;

      await getImportRunErrors(client, 'pipeline-456', 'batch_01', 'open');

      expect(get).toHaveBeenCalledWith(
        '/api/v1/pipeline/runs/pipeline-456/import-run/errors',
        { params: { batch: 'batch_01', status: 'open' } },
      );
    });
  });

  describe('getImportRunRecords', () => {
    it('GETs records and returns items + total', async () => {
      const payload = { records: [], total: 0 };
      const get = jest.fn(async () => ({ data: payload }));
      const client = { get } as unknown as HttpClient;

      const result = await getImportRunRecords(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.total).toBe(0);
    });
  });

  describe('getImportRunConnectorRequests', () => {
    it('GETs connector requests and returns items + total', async () => {
      const payload = { requests: [], total: 0 };
      const get = jest.fn(async () => ({ data: payload }));
      const client = { get } as unknown as HttpClient;

      const result = await getImportRunConnectorRequests(client, 'pipeline-456');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.total).toBe(0);
    });
  });
});
