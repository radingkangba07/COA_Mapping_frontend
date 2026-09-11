// Unit tests for mcpFormToConnection — pure mapper, no network or mocks needed.

import { createInitialMcpForm, type McpConnectionForm } from '../mcp.service';
import { mcpFormToConnection } from '../mcp-connection.mapper';

function makeForm(overrides: Partial<McpConnectionForm> = {}): McpConnectionForm {
  return { ...createInitialMcpForm(), ...overrides };
}

describe('mcpFormToConnection', () => {
  const base: Partial<McpConnectionForm> = {
    url: 'https://mcp.example.com',
    authType: 'bearer',
    token: 'tok123',
    headers: [],
    skipSSL: false,
    proxy: false,
    timeout: 30,
  };

  it('maps bearer authType directly to bearer', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, authType: 'bearer' }), 'source');
    expect(conn.authType).toBe('bearer');
  });

  it('maps apiKey authType directly to apiKey', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, authType: 'apiKey' }), 'source');
    expect(conn.authType).toBe('apiKey');
  });

  it('maps tba authType to bearer (lean MCPConnection has no tba member)', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, authType: 'tba' }), 'source');
    expect(conn.authType).toBe('bearer');
  });

  it('maps oauth2 authType to bearer (lean MCPConnection has no oauth2 member)', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, authType: 'oauth2' }), 'source');
    expect(conn.authType).toBe('bearer');
  });

  it('copies url and token from the form', () => {
    const conn = mcpFormToConnection(makeForm({ ...base }), 'source');
    expect(conn.url).toBe('https://mcp.example.com');
    expect(conn.token).toBe('tok123');
  });

  it('converts timeout from seconds to milliseconds', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, timeout: 30 }), 'source');
    expect(conn.timeout).toBe(30_000);
  });

  it('maps proxy: true to the string "enabled"', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, proxy: true }), 'source');
    expect(conn.proxy).toBe('enabled');
  });

  it('maps proxy: false to an empty string', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, proxy: false }), 'source');
    expect(conn.proxy).toBe('');
  });

  it('copies skipSSL from the form', () => {
    const conn = mcpFormToConnection(makeForm({ ...base, skipSSL: true }), 'source');
    expect(conn.skipSSL).toBe(true);
  });

  it('maps header key/value pairs, stripping the id field', () => {
    const conn = mcpFormToConnection(
      makeForm({
        ...base,
        headers: [
          { id: 'h-1', key: 'X-Custom', value: 'v1' },
          { id: 'h-2', key: 'Authorization', value: 'Bearer x' },
        ],
      }),
      'source',
    );
    expect(conn.headers).toEqual([
      { key: 'X-Custom', value: 'v1' },
      { key: 'Authorization', value: 'Bearer x' },
    ]);
  });

  it('sets the scope from the argument (not from the form)', () => {
    const conn = mcpFormToConnection(makeForm(base), 'target');
    expect(conn.scope).toBe('target');
  });
});
