// Unit tests for erp-connection.service — mocks HttpClient; no real network.

import type { HttpClient } from '@/shared/services/http/http.types';
import { createInitialMcpForm, type McpConnectionForm } from '../mcp.service';
import {
  resolveErpId,
  startOAuth2Flow,
  createMcpConnection,
  testMcpConnection,
} from '../erp-connection.service';

function makeClient(post: jest.Mock): HttpClient {
  return { post } as unknown as HttpClient;
}

function makeForm(overrides: Partial<McpConnectionForm> = {}): McpConnectionForm {
  return { ...createInitialMcpForm(), ...overrides };
}

// ─── resolveErpId ─────────────────────────────────────────────────────────────

describe('resolveErpId', () => {
  it('maps oracle_netsuite to netsuite', () => {
    expect(resolveErpId('oracle_netsuite')).toBe('netsuite');
  });

  it('maps odoo to odoo', () => {
    expect(resolveErpId('odoo')).toBe('odoo');
  });

  it('maps odoo_enterprise to odoo', () => {
    expect(resolveErpId('odoo_enterprise')).toBe('odoo');
  });

  it('maps tallyprime to tally', () => {
    expect(resolveErpId('tallyprime')).toBe('tally');
  });

  it('returns null for an unknown product', () => {
    expect(resolveErpId('sap')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(resolveErpId(null)).toBeNull();
  });
});

// ─── startOAuth2Flow ──────────────────────────────────────────────────────────

describe('startOAuth2Flow', () => {
  it('returns ok with auth_url and state on success', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { auth_url: 'https://auth.example.com', state: 'abc123' },
    });
    const result = await startOAuth2Flow(makeClient(post), 'client_id', 'secret', 'https://acme.netsuite.com');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.auth_url).toBe('https://auth.example.com');
      expect(result.data.state).toBe('abc123');
    }
  });

  it('posts to the correct endpoint with the correct payload', async () => {
    const post = jest.fn().mockResolvedValue({ data: { auth_url: 'u', state: 's' } });
    await startOAuth2Flow(makeClient(post), 'cid', 'csecret', 'https://base.url');

    expect(post).toHaveBeenCalledWith('/api/v1/mcp-clients/oauth2/start', {
      client_id: 'cid',
      client_secret: 'csecret',
      base_url: 'https://base.url',
    });
  });

  it('returns err when the request throws', async () => {
    const post = jest.fn().mockRejectedValue(new Error('Network error'));
    const result = await startOAuth2Flow(makeClient(post), 'c', 's', 'https://base.url');

    expect(result.ok).toBe(false);
  });
});

// ─── createMcpConnection ──────────────────────────────────────────────────────

describe('createMcpConnection', () => {
  const bearerForm = makeForm({
    url: '  https://mcp.example.com  ',
    authType: 'bearer',
    token: 'tok',
  });

  it('returns ok with the connection record on success', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 'conn-1', version: 1 } });
    const result = await createMcpConnection(makeClient(post), 'odoo', 'source', bearerForm, 'My Label');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('conn-1');
    }
  });

  it('posts to /api/v1/mcp-clients with trimmed url and correct role', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 'c', version: 1 } });
    await createMcpConnection(makeClient(post), 'odoo', 'target', bearerForm, 'Lbl');

    expect(post).toHaveBeenCalledWith(
      '/api/v1/mcp-clients',
      expect.objectContaining({
        label: 'Lbl',
        erp_id: 'odoo',
        connection_role: 'target',
        base_url: 'https://mcp.example.com',
        auth_strategy: 'bearer',
      }),
    );
  });

  it('sends api_key auth_strategy for apiKey authType', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 'c', version: 1 } });
    const form = makeForm({ url: 'https://mcp.example.com', authType: 'apiKey', apiKey: 'k' });
    await createMcpConnection(makeClient(post), 'odoo', 'source', form, 'Lbl');

    expect(post).toHaveBeenCalledWith(
      '/api/v1/mcp-clients',
      expect.objectContaining({ auth_strategy: 'api_key' }),
    );
  });

  it('includes consumer_key and token_id in erp_config for tba', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 'c', version: 1 } });
    const form = makeForm({
      url: 'https://mcp.example.com',
      authType: 'tba',
      consumerKey: 'ck',
      tokenId: 'ti',
    });
    await createMcpConnection(makeClient(post), 'netsuite', 'source', form, 'Lbl');

    expect(post).toHaveBeenCalledWith(
      '/api/v1/mcp-clients',
      expect.objectContaining({
        erp_config: expect.objectContaining({ consumer_key: 'ck', token_id: 'ti' }),
      }),
    );
  });

  it('includes client_id in erp_config for oauth2', async () => {
    const post = jest.fn().mockResolvedValue({ data: { id: 'c', version: 1 } });
    const form = makeForm({ url: 'https://mcp.example.com', authType: 'oauth2', clientId: 'cid' });
    await createMcpConnection(makeClient(post), 'netsuite', 'source', form, 'Lbl');

    expect(post).toHaveBeenCalledWith(
      '/api/v1/mcp-clients',
      expect.objectContaining({ erp_config: { client_id: 'cid' } }),
    );
  });

  it('returns err when the request throws', async () => {
    const post = jest.fn().mockRejectedValue(new Error('500'));
    const result = await createMcpConnection(makeClient(post), 'odoo', 'source', bearerForm, 'L');

    expect(result.ok).toBe(false);
  });
});

// ─── testMcpConnection ────────────────────────────────────────────────────────

describe('testMcpConnection', () => {
  const bearerForm = makeForm({
    url: 'https://mcp.example.com',
    authType: 'bearer',
    token: 'tok',
  });

  it('returns ok with connectedAt when success is true', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true, latency_ms: 42 } });
    const result = await testMcpConnection(makeClient(post), 'conn-1', bearerForm);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.connectedAt).toBeTruthy();
    }
  });

  it('posts credentials to the correct endpoint', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true, latency_ms: 10 } });
    await testMcpConnection(makeClient(post), 'conn-42', bearerForm);

    expect(post).toHaveBeenCalledWith(
      '/api/v1/mcp-clients/conn-42/test',
      { credentials: { access_token: 'tok' } },
    );
  });

  it('sends api_key credential for apiKey authType', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: true, latency_ms: 5 } });
    const form = makeForm({ url: 'https://mcp.example.com', authType: 'apiKey', apiKey: 'mykey' });
    await testMcpConnection(makeClient(post), 'c', form);

    expect(post).toHaveBeenCalledWith(
      '/api/v1/mcp-clients/c/test',
      { credentials: { api_key: 'mykey' } },
    );
  });

  it('returns err with CONNECTION_FAILED when success is false', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { success: false, latency_ms: 10, error: 'auth_failed' },
    });
    const result = await testMcpConnection(makeClient(post), 'c', bearerForm);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONNECTION_FAILED');
      expect(result.error.message).toBe('auth_failed');
    }
  });

  it('falls back to a generic message when the error field is absent', async () => {
    const post = jest.fn().mockResolvedValue({ data: { success: false, latency_ms: 5 } });
    const result = await testMcpConnection(makeClient(post), 'c', bearerForm);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBeTruthy();
    }
  });

  it('returns err when the request throws', async () => {
    const post = jest.fn().mockRejectedValue(new Error('network'));
    const result = await testMcpConnection(makeClient(post), 'c', bearerForm);

    expect(result.ok).toBe(false);
  });
});
