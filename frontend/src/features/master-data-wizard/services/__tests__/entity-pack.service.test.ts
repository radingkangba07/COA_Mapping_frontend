import { AxiosError, AxiosHeaders } from 'axios';
import {
  getEntityPack,
  uploadSourceFile,
  createPipelineRun,
  getPipelineRun,
  overrideFieldType,
  mapEntityPackResponse,
  getEntityPackFromApi,
  getActivePipelineRun,
  isPipelineRunConflict,
  listWorkstreamFiles,
  getFileById,
  fileMatchesContext,
  deleteFile,
  type PipelineRun,
  type FieldProfileRead,
  type EntityPackApiResponse,
  type PersistedFile,
} from '../entity-pack.service';
import type { HttpClient } from '@/shared/services/http/http.types';

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { httpClient } from '@/shared/services/http/http.instance';

const mockGet = httpClient.get as jest.Mock;
const mockPost = httpClient.post as jest.Mock;
const mockPatch = httpClient.patch as jest.Mock;
const mockDelete = httpClient.delete as jest.Mock;

function makeAxiosError(options: {
  status?: number;
  data?: Record<string, unknown>;
  message?: string;
  url?: string;
}): AxiosError {
  const headers = new AxiosHeaders();
  const config = { url: options.url ?? '/test', headers };

  return new AxiosError(
    options.message ?? 'Request failed',
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    options.status !== undefined
      ? {
          status: options.status,
          statusText: 'Error',
          headers: {},
          config,
          data: options.data ?? {},
        }
      : undefined,
  );
}

/** A network error with no `response` at all — connection refused / DNS failure / timeout. */
function makeNetworkError(url = '/test'): AxiosError {
  return new AxiosError('Network Error', AxiosError.ERR_NETWORK, { url, headers: new AxiosHeaders() });
}

const PIPELINE_RUN_DTO = {
  id: 'run-1',
  workstream_id: 'ws-1',
  scope: 'items',
  status: 'pending',
  source_row_count: 10,
  field_count: null,
  fields_processed: null,
  error_detail: null,
  created_at: '2026-01-01T00:00:00Z',
  completed_at: null,
  run_summary: null,
};

const PIPELINE_RUN: PipelineRun = {
  id: 'run-1',
  workstreamId: 'ws-1',
  scope: 'items',
  status: 'pending',
  sourceRowCount: 10,
  fieldCount: null,
  fieldsProcessed: null,
  errorDetail: null,
  createdAt: '2026-01-01T00:00:00Z',
  completedAt: null,
  runSummary: null,
};

function makeFieldProfile(overrides: Partial<FieldProfileRead> = {}): FieldProfileRead {
  return {
    id: 'field-1',
    field_name: 'account_no',
    detected_type: 'text',
    total_count: 100,
    null_count: 0,
    distinct_count: 100,
    cardinality: 'high',
    duplicate_row_count: 0,
    duplicate_group_count: 0,
    invalid_count: 0,
    reference_failures: 0,
    is_enumeration_candidate: false,
    pattern_anomalies: 0,
    anomaly_count: 0,
    semantic_role: null,
    role_description: null,
    confidence_score: null,
    evidence: null,
    severity: 'clean',
    stats: null,
    pattern_summary: null,
    anomaly_examples: null,
    enumeration_detail: null,
    sample_values: null,
    value_distribution: null,
    format_detected: null,
    user_override_type: null,
    override_status: null,
    overridden_by: null,
    overridden_at: null,
    ...overrides,
  };
}

describe('entity-pack.service', () => {
  describe('getEntityPack', () => {
    it('returns a valid EntityPack for the items fixture', async () => {
      const result = await getEntityPack('items');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('items');
        expect(result.data.label.plural).toBe('Items');
        expect(result.data.fields.length).toBeGreaterThan(0);
        expect(result.data.readiness).toBeDefined();
        expect(result.data.metrics).toBeDefined();
      }
    });

    it('returns a valid EntityPack for the customers fixture', async () => {
      const result = await getEntityPack('customers');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('customers');
        expect(result.data.label.plural).toBe('Customers');
        expect(result.data.fields.length).toBeGreaterThan(0);
      }
    });

    it('returns entity_pack_not_found for an entity with no fixture', async () => {
      const result = await getEntityPack('vendors');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('entity_pack_not_found');
      }
    });

    it('returns entity_pack_invalid when the fixture fails schema validation', async () => {
      // The fixture is a static import, so a mid-file mock + re-require (this
      // Jest config transpiles to CommonJS — dynamic `import()` isn't
      // available without --experimental-vm-modules) is the only way to
      // exercise the "malformed data" branch without a real broken fixture
      // living in the repo.
      jest.resetModules();
      jest.doMock('../../dp-kit/fixtures/items.entity.json', () => ({
        id: 'items',
        label: { singular: 'Item', plural: 'Items' },
        source: { object: 'Item master extract' },
        identity: { candidates: [] },
        // `fields` and `datatype`/`impact` on each field are required by the
        // schema — omitting `fields` entirely is the deliberate break here.
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getEntityPack: getEntityPackWithBrokenFixture } = require('../entity-pack.service');
      const result = await getEntityPackWithBrokenFixture('items');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('entity_pack_invalid');
        expect(result.error.details).toHaveProperty('issues');
      }

      jest.dontMock('../../dp-kit/fixtures/items.entity.json');
      jest.resetModules();
    });
  });

  describe('uploadSourceFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('parses a successful upload response into an UploadResult', async () => {
      const post = jest.fn().mockResolvedValue({
        data: {
          success: true,
          file: {
            id: 'file-1',
            file_type: 'source_erp',
            original_filename: 'a.csv',
            storage_path: '/storage/a.csv',
            content_type: 'text/csv',
            size_bytes: 128,
            status: 'uploaded',
            row_count: 2,
            created_at: '2026-01-01T00:00:00Z',
          },
        },
      });
      const client = { post } as unknown as HttpClient;
      const file = new File(['a,b\n1,2'], 'a.csv', { type: 'text/csv' });

      const result = await uploadSourceFile(client, file, { orgProjectId: 'org-1', fileType: 'source_erp' });

      expect(post).toHaveBeenCalledWith(
        '/api/v1/storage/upload',
        expect.any(FormData),
        { headers: { 'Content-Type': undefined } },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
          fileId: 'file-1',
          fileName: 'a.csv',
          fileType: 'source_erp',
          contentType: 'text/csv',
          sizeBytes: 128,
          status: 'uploaded',
          rowCount: 2,
          storagePath: '/storage/a.csv',
          createdAt: '2026-01-01T00:00:00Z',
        });
      }
    });

    it('appends org_project_id/workstream_id — entity_id is not part of the upload contract (see uploadSourceFile\'s own doc comment: the backend\'s Form(...) parameters don\'t declare it)', async () => {
      const post = jest.fn().mockResolvedValue({
        data: {
          file: {
            id: 'file-3',
            file_type: 'source_erp',
            original_filename: 'b.csv',
            storage_path: '/storage/b.csv',
            content_type: 'text/csv',
            size_bytes: 32,
            status: 'uploaded',
            row_count: 1,
            created_at: '2026-01-01T00:00:00Z',
          },
        },
      });
      const client = { post } as unknown as HttpClient;
      const file = new File(['a,b\n1,2'], 'b.csv', { type: 'text/csv' });

      await uploadSourceFile(client, file, { orgProjectId: 'org-1', workstreamId: 'ws-1' });

      const formData = post.mock.calls[0][1] as FormData;
      expect(formData.get('org_project_id')).toBe('org-1');
      expect(formData.get('workstream_id')).toBe('ws-1');
      expect(formData.get('entity_id')).toBeNull();
    });

    it('appends the native-picker file shape (uri/name/mimeType) for a non-web UploadedFile', async () => {
      const post = jest.fn().mockResolvedValue({
        data: {
          file: {
            id: 'file-2',
            file_type: 'source_erp',
            original_filename: 'native.csv',
            storage_path: '/storage/native.csv',
            content_type: 'text/csv',
            size_bytes: 64,
            status: 'uploaded',
            row_count: 1,
            created_at: '2026-01-01T00:00:00Z',
          },
        },
      });
      const client = { post } as unknown as HttpClient;

      const result = await uploadSourceFile(client, { uri: 'file:///native.csv', name: 'native.csv', mimeType: 'text/csv' });

      expect(result.ok).toBe(true);
      const formData = post.mock.calls[0][1] as FormData;
      expect(formData.get('file')).not.toBeNull();
    });

    it('returns INVALID_RESPONSE when the server response fails schema validation', async () => {
      const post = jest.fn().mockResolvedValue({ data: { success: true } }); // missing `file`
      const client = { post } as unknown as HttpClient;
      const file = new File(['x'], 'a.csv', { type: 'text/csv' });

      const result = await uploadSourceFile(client, file);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_RESPONSE');
        expect(result.error.details).toHaveProperty('issues');
      }
    });

    it('returns SERVER_UNREACHABLE when the request never gets a response (backend down)', async () => {
      const post = jest.fn().mockRejectedValue(makeNetworkError('/api/v1/storage/upload'));
      const client = { post } as unknown as HttpClient;
      const file = new File(['x'], 'a.csv', { type: 'text/csv' });

      const result = await uploadSourceFile(client, file);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({
          code: 'SERVER_UNREACHABLE',
          message: 'Cannot reach the server. Make sure it is running, then try again.',
        });
      }
    });

    it('falls back to toAppError for a real server error response (e.g. 500)', async () => {
      const post = jest.fn().mockRejectedValue(
        makeAxiosError({ status: 500, data: { message: 'boom' }, url: '/api/v1/storage/upload' }),
      );
      const client = { post } as unknown as HttpClient;
      const file = new File(['x'], 'a.csv', { type: 'text/csv' });

      const result = await uploadSourceFile(client, file);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_500');
        expect(result.error.message).toBe('boom');
      }
    });
  });

  describe('createPipelineRun', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('POSTs the workstream/scope/source ref and maps the response to a PipelineRun', async () => {
      mockPost.mockResolvedValueOnce({ data: PIPELINE_RUN_DTO });

      const result = await createPipelineRun('ws-1', 'items', '/storage/a.csv');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/pipeline/runs', {
        workstream_id: 'ws-1',
        scope: 'items',
        source_file_ref: '/storage/a.csv',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(PIPELINE_RUN);
      }
    });

    it('surfaces a 409 conflict as an AppError with code HTTP_409', async () => {
      mockPost.mockRejectedValueOnce(
        makeAxiosError({ status: 409, data: { detail: 'run already in progress' }, url: '/api/v1/pipeline/runs' }),
      );

      const result = await createPipelineRun('ws-1', 'items', '/storage/a.csv');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_409');
        expect(isPipelineRunConflict(result.error)).toBe(true);
      }
    });

    it('sends "fixed_assets" (backend scope) when called with the EntityId "fixedAssets" — every other EntityId matches its backend scope 1:1, this is the one that doesn\'t', async () => {
      mockPost.mockResolvedValueOnce({ data: { ...PIPELINE_RUN_DTO, scope: 'fixed_assets' } });

      await createPipelineRun('ws-1', 'fixedAssets', '/storage/a.csv');

      expect(mockPost).toHaveBeenCalledWith('/api/v1/pipeline/runs', {
        workstream_id: 'ws-1',
        scope: 'fixed_assets',
        source_file_ref: '/storage/a.csv',
      });
    });
  });

  describe('getPipelineRun', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('GETs the run by id and maps the response to a PipelineRun', async () => {
      mockGet.mockResolvedValueOnce({ data: PIPELINE_RUN_DTO });

      const result = await getPipelineRun('run-1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/pipeline/runs/run-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(PIPELINE_RUN);
      }
    });

    it('returns a toAppError-shaped error on failure', async () => {
      mockGet.mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'not found' } }));

      const result = await getPipelineRun('missing-run');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
        expect(result.error.message).toBe('not found');
      }
    });
  });

  describe('overrideFieldType', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('PATCHes the override and returns the raw FieldProfileRead (unmapped)', async () => {
      const updatedField = makeFieldProfile({ user_override_type: 'integer' });
      mockPatch.mockResolvedValueOnce({ data: updatedField });

      const result = await overrideFieldType('run-1', 'account_no', 'integer', 'YYYY-MM-DD');

      expect(mockPatch).toHaveBeenCalledWith(
        '/api/v1/pipeline/runs/run-1/fields/account_no/type',
        { override_type: 'integer', date_format: 'YYYY-MM-DD' },
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(updatedField);
      }
    });

    it('returns a toAppError-shaped error on failure', async () => {
      mockPatch.mockRejectedValueOnce(makeAxiosError({ status: 422, data: { detail: 'invalid override' } }));

      const result = await overrideFieldType('run-1', 'account_no', 'integer');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_422');
        expect(result.error.message).toBe('invalid override');
      }
    });
  });

  describe('mapEntityPackResponse', () => {
    it('capitalises/pluralises the scope for the label and reads rowCount from the run', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.id).toBe('items');
      expect(pack.label).toEqual({ singular: 'Items', plural: 'Itemss' });
      expect(pack.source).toEqual({ object: 'items', rowCount: 10 });
      expect(pack.target).toEqual({ record: '' });
      expect(pack.identity).toEqual({ candidates: [], confirmed: undefined });
      // No fields — nothing for ReadinessBanner to summarize.
      expect(pack.readiness).toBeUndefined();
      // KpiStrip's tile definitions are always populated (scope-agnostic,
      // computed live off pack.fields by buildMetrics) — never left
      // undefined the way readiness legitimately can be.
      expect(pack.metrics?.length).toBeGreaterThan(0);
      expect(pack.metrics?.map((m) => m.id)).toEqual(['records', 'fields', 'blockers', 'review', 'nulls']);
    });

    it('falls back to an undefined rowCount when the run has none', () => {
      const response: EntityPackApiResponse = { run_id: 'run-1', scope: 'items', status: 'complete', run_summary: null, fields: [] };
      const runWithNoRowCount: PipelineRun = { ...PIPELINE_RUN, sourceRowCount: null };

      const pack = mapEntityPackResponse(response, runWithNoRowCount);

      expect(pack.source.rowCount).toBeUndefined();
    });

    it('converts the backend\'s "fixed_assets" scope back to the EntityId "fixedAssets" for id/source, and titles the label "Fixed Assets"', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'fixed_assets',
        status: 'complete',
        run_summary: null,
        fields: [],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.id).toBe('fixedAssets');
      expect(pack.source.object).toBe('fixedAssets');
      expect(pack.label.singular).toBe('Fixed Assets');
    });

    it.each([
      ['clean', 'clean'],
      ['warning', 'warning'],
      ['blocker', 'blocker'],
      ['review', 'review'],
      [null, 'na'],
    ] as const)('maps severity %s to impact %s', (severity, impact) => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [makeFieldProfile({ severity })],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.impact).toBe(impact);
    });

    it('maps enumeration_detail\'s snake_case keys onto EntityField.enumeration (camelCase) rather than leaving them undefined', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({
            enumeration_detail: {
              candidate: 'Yes',
              valid_ref: 2,
              invalid_src: 0,
              affected_rows: 2,
              ref_integrity: 'Passed',
            },
          }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.enumeration).toEqual({
        candidate: 'Yes',
        validRef: 2,
        invalidSrc: 0,
        affectedRows: 2,
        aliasRows: undefined,
        unresolved: undefined,
        refIntegrity: 'Passed',
        categoryAvailable: undefined,
        highConf: undefined,
        ambiguous: undefined,
        insufficient: undefined,
      });
    });

    it('maps a reference_integrity anomaly_examples payload onto invalidTable, humanizing the status and never leaving it as raw JSON', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({
            anomaly_examples: {
              type: 'reference_integrity',
              details: [
                { source: 'Nos', canonical: 'ea', rows: 102, status: 'recognized_alias' },
                { source: 'For Purchase', canonical: null, rows: 2, status: 'review_required' },
              ],
            },
          }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.invalidTable).toEqual([
        { src: 'Nos', canon: 'Ea', occ: 102, status: 'Recognized Alias', tone: 'ok' },
        { src: 'For Purchase', canon: undefined, occ: 2, status: 'Review Required', tone: 'warn' },
      ]);
    });

    it('leaves invalidTable undefined when anomaly_examples is null or a different shape', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({ anomaly_examples: null }),
          makeFieldProfile({ field_name: 'other', anomaly_examples: { type: 'outlier', examples: ['1', '2'] } }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.invalidTable).toBeUndefined();
      expect(pack.fields[1]!.invalidTable).toBeUndefined();
    });

    describe('readiness', () => {
      it('builds a blocker-tone readiness summary — real field names in recommendedOrder, real counts as evidence', () => {
        const response: EntityPackApiResponse = {
          run_id: 'run-1',
          scope: 'items',
          status: 'complete',
          run_summary: null,
          fields: [
            makeFieldProfile({ field_name: 'sku', severity: 'blocker' }),
            makeFieldProfile({ field_name: 'uom', severity: 'review' }),
            makeFieldProfile({ field_name: 'display_name', severity: 'clean' }),
          ],
        };

        const pack = mapEntityPackResponse(response, PIPELINE_RUN);

        expect(pack.readiness?.tone).toBe('blocker');
        expect(pack.readiness?.headline).toBe('Migration readiness: Needs attention');
        expect(pack.readiness?.recommendedOrder).toEqual([{ label: 'Resolve sku', target: 'sku' }]);
        expect(pack.readiness?.evidence).toEqual([
          { value: '3', label: 'fields profiled' },
          { value: '1', label: 'blocking issues' },
          { value: '1', label: 'need review' },
          { value: '1', label: 'clean' },
        ]);
      });

      it('builds a neutral-tone "ready" summary when every field is clean', () => {
        const response: EntityPackApiResponse = {
          run_id: 'run-1',
          scope: 'items',
          status: 'complete',
          run_summary: null,
          fields: [makeFieldProfile({ field_name: 'sku', severity: 'clean' })],
        };

        const pack = mapEntityPackResponse(response, PIPELINE_RUN);

        expect(pack.readiness?.tone).toBe('neutral');
        expect(pack.readiness?.headline).toBe('Migration readiness: Ready');
        expect(pack.readiness?.recommendedOrder).toEqual([]);
        expect(pack.readiness?.narrative).toContain('ready to generate mappings');
      });
    });

    it('prefers user_override_type over detected_type when mapping datatype', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [makeFieldProfile({ detected_type: 'text', user_override_type: 'decimal' })],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.datatype).toBe('Decimal');
    });

    it('computes uniqueness from distinct_count/total_count as a 0-100 percentage, and leaves it undefined when total_count is 0 or missing', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({ field_name: 'a', distinct_count: 50, total_count: 100 }),
          makeFieldProfile({ field_name: 'b', distinct_count: 50, total_count: 0 }),
          makeFieldProfile({ field_name: 'c', distinct_count: null, total_count: 100 }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.uniqueness).toBe(50);
      expect(pack.fields[1]!.uniqueness).toBeUndefined();
      expect(pack.fields[2]!.uniqueness).toBeUndefined();
    });

    it('scales confidence_score from a 0-1 fraction to a 0-100 percentage, and leaves it undefined when null', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({ field_name: 'a', confidence_score: 0.88 }),
          makeFieldProfile({ field_name: 'b', confidence_score: 1 }),
          makeFieldProfile({ field_name: 'c', confidence_score: null }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.confidence).toBeCloseTo(88);
      expect(pack.fields[1]!.confidence).toBe(100);
      expect(pack.fields[2]!.confidence).toBeUndefined();
    });

    it('maps duplicates and patternAnomalies through from the field profile', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [makeFieldProfile({ duplicate_row_count: 3, duplicate_group_count: 1, pattern_anomalies: 2 })],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.duplicates).toEqual({ rows: 3, groups: 1 });
      expect(pack.fields[0]!.patternAnomalies).toBe(2);
    });

    it('unwraps sample_values.values into the Sample column\'s plain string array', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({
            field_name: 'cost_center',
            sample_values: { values: ['IC COGS', 'FTE (LZA)', 'FTE (Non-Billable)', 'Re Devices', 'FTE (LIN)'] },
          }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.sample).toEqual(['IC COGS', 'FTE (LZA)', 'FTE (Non-Billable)', 'Re Devices', 'FTE (LIN)']);
    });

    it('leaves sample undefined when sample_values is null or has no values array', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({ field_name: 'a', sample_values: null }),
          makeFieldProfile({ field_name: 'b', sample_values: {} }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.sample).toBeUndefined();
      expect(pack.fields[1]!.sample).toBeUndefined();
    });

    it('never lets a raw JSON/object sample value reach the Sample column as literal braces or quotes', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({
            field_name: 'unit_of_measure',
            sample_values: {
              values: [
                '{"type":"reference_integrity","details":[{"source":"Nos","canonical":"ea","rows":102,"status":"recognized_alias"}]}',
                { source: 'Mtrs', canonical: 'm' },
                42,
              ],
            },
          }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      const sample = pack.fields[0]!.sample ?? [];
      expect(sample.some((s) => /[{}"[\]]/.test(s))).toBe(false);
      expect(sample).toEqual(['Type: Reference Integrity · Details: Source: Nos, Canonical: Ea, Rows: 102, Status: Recognized Alias', 'Source: Mtrs · Canonical: M', '42']);
    });

    it('title-cases cardinality but leaves it undefined when the backend sends none', () => {
      const response: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [
          makeFieldProfile({ field_name: 'a', cardinality: 'high' }),
          makeFieldProfile({ field_name: 'b', cardinality: null }),
        ],
      };

      const pack = mapEntityPackResponse(response, PIPELINE_RUN);

      expect(pack.fields[0]!.cardinality).toBe('High');
      expect(pack.fields[1]!.cardinality).toBeUndefined();
    });
  });

  describe('getEntityPackFromApi', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fetches the profile, chains through getPipelineRun for sourceRowCount, and returns a mapped EntityPack', async () => {
      const apiResponse: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [makeFieldProfile()],
      };
      mockGet
        .mockResolvedValueOnce({ data: apiResponse })
        .mockResolvedValueOnce({ data: PIPELINE_RUN_DTO });

      const result = await getEntityPackFromApi('org-1', 'items');

      expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/projects/org-1/entities/items/profile');
      expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/pipeline/runs/run-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.source.rowCount).toBe(10);
        expect(result.data.fields).toHaveLength(1);
      }
    });

    it('returns a toAppError-shaped error when the profile fetch itself fails', async () => {
      mockGet.mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'no profile yet' } }));

      const result = await getEntityPackFromApi('org-1', 'items');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
      }
    });

    it('propagates the pipeline-run error unchanged when the profile succeeds but the run fetch fails', async () => {
      const apiResponse: EntityPackApiResponse = {
        run_id: 'run-missing',
        scope: 'items',
        status: 'complete',
        run_summary: null,
        fields: [],
      };
      mockGet
        .mockResolvedValueOnce({ data: apiResponse })
        .mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'run not found' } }));

      const result = await getEntityPackFromApi('org-1', 'items');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
        expect(result.error.message).toBe('run not found');
      }
    });
  });

  describe('getActivePipelineRun', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('fetches the profile for run_id then delegates to getPipelineRun for the full run', async () => {
      const apiResponse: EntityPackApiResponse = {
        run_id: 'run-1',
        scope: 'items',
        status: 'running',
        run_summary: null,
        fields: [],
      };
      mockGet
        .mockResolvedValueOnce({ data: apiResponse })
        .mockResolvedValueOnce({ data: PIPELINE_RUN_DTO });

      const result = await getActivePipelineRun('org-1', 'items');

      expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/projects/org-1/entities/items/profile');
      expect(mockGet).toHaveBeenNthCalledWith(2, '/api/v1/pipeline/runs/run-1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(PIPELINE_RUN);
      }
    });

    it('returns a toAppError-shaped error when the lookup itself fails', async () => {
      mockGet.mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'no active run' } }));

      const result = await getActivePipelineRun('org-1', 'items');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
      }
    });
  });

  describe('isPipelineRunConflict', () => {
    it('is true only for HTTP_409', () => {
      expect(isPipelineRunConflict({ code: 'HTTP_409', message: 'x' })).toBe(true);
      expect(isPipelineRunConflict({ code: 'HTTP_500', message: 'x' })).toBe(false);
      expect(isPipelineRunConflict({ code: 'UNKNOWN_ERROR', message: 'x' })).toBe(false);
    });
  });

  describe('listWorkstreamFiles', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const FILE_DTO = {
      id: 'file-1',
      file_type: 'source_erp',
      original_filename: 'customers.csv',
      storage_path: '/storage/file-1',
      content_type: 'text/csv',
      size_bytes: 2048,
      status: 'ready',
      columns: ['Account No', 'Customer Name'],
      row_count: 12,
      created_at: '2026-09-01T00:00:00Z',
    };

    it('GETs the workstream files and maps each to a PersistedFile, alongside total', async () => {
      mockGet.mockResolvedValueOnce({ data: { files: [FILE_DTO], total: 1 } });

      const result = await listWorkstreamFiles('ws-1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/files/workstream/ws-1', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        params: undefined,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
          files: [
            {
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
            },
          ],
          total: 1,
        });
      }
    });

    it('defaults columns to an empty array when the backend omits it', async () => {
      const { columns, ...withoutColumns } = FILE_DTO;
      void columns;
      mockGet.mockResolvedValueOnce({ data: { files: [withoutColumns], total: 1 } });

      const result = await listWorkstreamFiles('ws-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.files[0]?.columns).toEqual([]);
      }
    });

    it('returns an empty list when the workstream has no files', async () => {
      mockGet.mockResolvedValueOnce({ data: { files: [], total: 0 } });

      const result = await listWorkstreamFiles('ws-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ files: [], total: 0 });
      }
    });

    it('returns an INVALID_RESPONSE error when the response fails schema validation', async () => {
      mockGet.mockResolvedValueOnce({ data: { files: [{ id: 'file-1' }], total: 1 } });

      const result = await listWorkstreamFiles('ws-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_RESPONSE');
      }
    });

    it('returns a toAppError-shaped error on failure', async () => {
      mockGet.mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'not found' } }));

      const result = await listWorkstreamFiles('missing-workstream');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
        expect(result.error.message).toBe('not found');
      }
    });

    it('sends entity_id and org_project_id as query params when both are given', async () => {
      mockGet.mockResolvedValueOnce({ data: { files: [FILE_DTO], total: 1 } });

      await listWorkstreamFiles('ws-1', 'customers', 'org-1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/files/workstream/ws-1', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        params: { entity_id: 'customers', org_project_id: 'org-1' },
      });
    });
  });

  describe('getFileById', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    const FILE_DTO = {
      id: 'file-1',
      file_type: 'source_erp',
      original_filename: 'customers.csv',
      storage_path: '/storage/file-1',
      content_type: 'text/csv',
      size_bytes: 2048,
      status: 'ready',
      columns: ['Account No', 'Customer Name'],
      row_count: 12,
      created_at: '2026-09-01T00:00:00Z',
    };

    it('GETs the file by id and maps it to a PersistedFile', async () => {
      mockGet.mockResolvedValueOnce({ data: FILE_DTO });

      const result = await getFileById('file-1');

      expect(mockGet).toHaveBeenCalledWith('/api/v1/storage/files/file-1', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
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
        });
      }
    });

    it('sends org_project_id, entity_id and workstream_id as query params when given', async () => {
      mockGet.mockResolvedValueOnce({ data: FILE_DTO });

      await getFileById('file-1', { orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' });

      expect(mockGet).toHaveBeenCalledWith('/api/v1/storage/files/file-1', {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        params: { org_project_id: 'org-1', entity_id: 'customers', workstream_id: 'ws-1' },
      });
    });

    it('returns an INVALID_RESPONSE error when the response fails schema validation', async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 'file-1' } });

      const result = await getFileById('file-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_RESPONSE');
      }
    });

    it('returns a toAppError-shaped error on failure', async () => {
      mockGet.mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'not found' } }));

      const result = await getFileById('missing-file');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
        expect(result.error.message).toBe('not found');
      }
    });
  });

  describe('fileMatchesContext', () => {
    function makeFile(overrides: Partial<PersistedFile> = {}): PersistedFile {
      return {
        id: 'file-1',
        fileType: 'source_erp',
        originalFilename: 'customers.csv',
        storagePath: '/storage/file-1',
        contentType: 'text/csv',
        sizeBytes: 2048,
        status: 'ready',
        columns: [],
        rowCount: 12,
        createdAt: '2026-09-01T00:00:00Z',
        ...overrides,
      };
    }

    it('passes a file that carries none of org_project_id/entity_id/workstream_id — today\'s real backend contract, nothing to check', () => {
      const file = makeFile();
      expect(fileMatchesContext(file, { orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' })).toBe(true);
    });

    it('rejects a file whose entityId disagrees with the current context (e.g. a Vendor file surfacing under Customer)', () => {
      const file = makeFile({ entityId: 'vendors' });
      expect(fileMatchesContext(file, { orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' })).toBe(false);
    });

    it('rejects a file whose orgProjectId disagrees with the current context', () => {
      const file = makeFile({ orgProjectId: 'org-2' });
      expect(fileMatchesContext(file, { orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' })).toBe(false);
    });

    it('rejects a file whose workstreamId disagrees with the current context', () => {
      const file = makeFile({ workstreamId: 'ws-2' });
      expect(fileMatchesContext(file, { orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' })).toBe(false);
    });

    it('accepts a file whose fields all agree with the current context', () => {
      const file = makeFile({ orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' });
      expect(fileMatchesContext(file, { orgProjectId: 'org-1', entityId: 'customers', workstreamId: 'ws-1' })).toBe(true);
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('DELETEs the file by id', async () => {
      mockDelete.mockResolvedValueOnce({ data: undefined });

      const result = await deleteFile('file-1');

      expect(mockDelete).toHaveBeenCalledWith('/api/v1/storage/files/file-1');
      expect(result.ok).toBe(true);
    });

    it('returns a toAppError-shaped error on failure', async () => {
      mockDelete.mockRejectedValueOnce(makeAxiosError({ status: 404, data: { detail: 'not found' } }));

      const result = await deleteFile('missing-file');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('HTTP_404');
        expect(result.error.message).toBe('not found');
      }
    });
  });
});
