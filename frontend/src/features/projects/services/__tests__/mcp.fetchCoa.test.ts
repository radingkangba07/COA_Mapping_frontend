// Pure unit tests for the fetchCoa service normalization (DA-52 / DA-155). These
// prove fetchCoa yields the same open-record CoaRow shape the CSV parser
// produces: normalized accountCode/accountName/accountType/parent fields plus any
// dynamic columns preserved. (Test-connection coverage lives in mcp.service.test.ts.)

import type { HttpClient } from '@/shared/services/http/http.types';
import {
  fetchCoa,
  type FetchCoaPayload,
} from '../mcp.service';

function makeClient(post: jest.Mock): HttpClient {
  // Only `post` is exercised; cast the partial mock to HttpClient.
  return { post } as unknown as HttpClient;
}

const PAYLOAD: FetchCoaPayload = {
  source_erp: 'sap',
  target_erp: 'netsuite',
  scope: {
    selected_master_data: [],
    selected_opening_balances: [],
    aggregation: 'none',
  },
  connection: {
    scope: 'source',
    url: 'https://mcp.example.com',
    token: 'abc',
    auth_type: 'bearer',
    headers: [],
    skip_ssl: false,
    proxy: '',
    timeout: 30000,
  },
};

describe('fetchCoa — normalization', () => {
  it('normalizes snake_case rows and preserves dynamic columns', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        source: [
          {
            account_code: '1000',
            account_name: 'Cash',
            account_type: 'Asset',
            parent_account: null,
            currency: 'USD',
          },
        ],
        target: [],
      },
    });

    const result = await fetchCoa(makeClient(post), PAYLOAD);

    expect(post).toHaveBeenCalledWith('/mcp/fetch-coa', PAYLOAD);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source).toHaveLength(1);
      expect(result.data.target).toEqual([]);
      // Normalized fields win; the dynamic `currency` column survives.
      expect(result.data.source[0]).toMatchObject({
        accountCode: '1000',
        accountName: 'Cash',
        accountType: 'Asset',
        parent: null,
        currency: 'USD',
      });
    }
  });

  it('treats a flat `rows` array as the source list', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        rows: [
          { account_code: '4000', account_name: 'Sales', account_type: 'Revenue' },
        ],
      },
    });

    const result = await fetchCoa(makeClient(post), PAYLOAD);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source).toHaveLength(1);
      expect(result.data.target).toEqual([]);
      expect(result.data.source[0]).toMatchObject({
        accountCode: '4000',
        accountName: 'Sales',
        accountType: 'Revenue',
        parent: null,
      });
    }
  });

  it('returns INVALID_RESPONSE for a malformed shape', async () => {
    const post = jest.fn().mockResolvedValue({ data: { source: 'nope' } });

    const result = await fetchCoa(makeClient(post), PAYLOAD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_RESPONSE');
    }
  });
});
