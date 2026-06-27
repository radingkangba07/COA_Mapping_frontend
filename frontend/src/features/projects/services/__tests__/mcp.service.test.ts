// Pure unit tests for the MCP connection form model + service (DA-49/DA-67).
// No RNTL — these are plain TS functions.

import {
  isValidMcpUrl,
  createInitialMcpForm,
  validateConnection,
  hasConnectionErrors,
  buildTestConnectionPayload,
  type McpConnectionForm,
} from '../mcp.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeForm(overrides: Partial<McpConnectionForm> = {}): McpConnectionForm {
  return { ...createInitialMcpForm(), ...overrides };
}

// ─── isValidMcpUrl ──────────────────────────────────────────────────────────

describe('isValidMcpUrl', () => {
  it('accepts http and https URLs with a host', () => {
    expect(isValidMcpUrl('http://mcp.example.com')).toBe(true);
    expect(isValidMcpUrl('https://mcp.example.com')).toBe(true);
    expect(isValidMcpUrl('https://mcp.example.com:8443/path')).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidMcpUrl('  https://mcp.example.com  ')).toBe(true);
  });

  it('rejects empty strings', () => {
    expect(isValidMcpUrl('')).toBe(false);
    expect(isValidMcpUrl('   ')).toBe(false);
  });

  it('rejects non-http(s) protocols', () => {
    expect(isValidMcpUrl('ftp://x')).toBe(false);
  });

  it('rejects unparseable values', () => {
    expect(isValidMcpUrl('notaurl')).toBe(false);
  });

  it('rejects URLs with no host', () => {
    expect(isValidMcpUrl('http://')).toBe(false);
  });
});

// ─── createInitialMcpForm ─────────────────────────────────────────────────────

describe('createInitialMcpForm', () => {
  it('returns the documented defaults', () => {
    expect(createInitialMcpForm()).toEqual({
      scope: 'both',
      activeTab: 'source',
      url: '',
      authType: 'bearer',
      token: '',
      apiKey: '',
      apiKeyName: '',
      username: '',
      password: '',
      clientId: '',
      clientSecret: '',
      tokenUrl: '',
      headers: [],
      skipSSL: false,
      proxy: false,
      timeout: 60,
    });
  });

  it('returns a fresh object on each call', () => {
    const a = createInitialMcpForm();
    const b = createInitialMcpForm();
    expect(a).not.toBe(b);
    expect(a.headers).not.toBe(b.headers);
  });
});

// ─── validateConnection — URL ─────────────────────────────────────────────────

describe('validateConnection — url', () => {
  it('flags an empty url', () => {
    const errors = validateConnection(makeForm({ url: '', token: 't' }));
    expect(errors.url).toBe('Enter a valid http(s) URL');
  });

  it('flags an invalid url', () => {
    const errors = validateConnection(makeForm({ url: 'notaurl', token: 't' }));
    expect(errors.url).toBe('Enter a valid http(s) URL');
  });

  it('does not flag a valid url', () => {
    const errors = validateConnection(
      makeForm({ url: 'https://mcp.example.com', token: 't' }),
    );
    expect(errors.url).toBeUndefined();
  });
});

// ─── validateConnection — bearer ──────────────────────────────────────────────

describe('validateConnection — bearer', () => {
  const base = { url: 'https://mcp.example.com', authType: 'bearer' as const };

  it('flags a missing token', () => {
    const errors = validateConnection(makeForm({ ...base, token: '' }));
    expect(errors.token).toBe('Access token is required');
  });

  it('treats a whitespace-only token as empty', () => {
    const errors = validateConnection(makeForm({ ...base, token: '   ' }));
    expect(errors.token).toBe('Access token is required');
  });

  it('passes with a token present', () => {
    const errors = validateConnection(makeForm({ ...base, token: 'abc' }));
    expect(errors.token).toBeUndefined();
  });
});

// ─── validateConnection — apiKey ──────────────────────────────────────────────

describe('validateConnection — apiKey', () => {
  const base = { url: 'https://mcp.example.com', authType: 'apiKey' as const };

  it('flags missing apiKey and apiKeyName', () => {
    const errors = validateConnection(
      makeForm({ ...base, apiKey: '', apiKeyName: '' }),
    );
    expect(errors.apiKey).toBe('API key is required');
    expect(errors.apiKeyName).toBe('Key name is required');
  });

  it('passes when both apiKey and apiKeyName are present', () => {
    const errors = validateConnection(
      makeForm({ ...base, apiKey: 'k', apiKeyName: 'X-API-Key' }),
    );
    expect(errors.apiKey).toBeUndefined();
    expect(errors.apiKeyName).toBeUndefined();
  });
});

// ─── validateConnection — basic ───────────────────────────────────────────────

describe('validateConnection — basic', () => {
  const base = { url: 'https://mcp.example.com', authType: 'basic' as const };

  it('flags missing username and password', () => {
    const errors = validateConnection(
      makeForm({ ...base, username: '', password: '' }),
    );
    expect(errors.username).toBe('Username is required');
    expect(errors.password).toBe('Password is required');
  });

  it('passes when both username and password are present', () => {
    const errors = validateConnection(
      makeForm({ ...base, username: 'u', password: 'p' }),
    );
    expect(errors.username).toBeUndefined();
    expect(errors.password).toBeUndefined();
  });
});

// ─── validateConnection — oauth2 ──────────────────────────────────────────────

describe('validateConnection — oauth2', () => {
  const base = { url: 'https://mcp.example.com', authType: 'oauth2' as const };

  it('flags missing clientId, clientSecret, and tokenUrl', () => {
    const errors = validateConnection(
      makeForm({ ...base, clientId: '', clientSecret: '', tokenUrl: '' }),
    );
    expect(errors.clientId).toBe('Client ID is required');
    expect(errors.clientSecret).toBe('Client secret is required');
    expect(errors.tokenUrl).toBe('Enter a valid token URL');
  });

  it('flags an invalid tokenUrl', () => {
    const errors = validateConnection(
      makeForm({
        ...base,
        clientId: 'c',
        clientSecret: 's',
        tokenUrl: 'notaurl',
      }),
    );
    expect(errors.tokenUrl).toBe('Enter a valid token URL');
  });

  it('passes when all fields are valid (valid http(s) tokenUrl)', () => {
    const errors = validateConnection(
      makeForm({
        ...base,
        clientId: 'c',
        clientSecret: 's',
        tokenUrl: 'https://auth.example.com/token',
      }),
    );
    expect(errors.clientId).toBeUndefined();
    expect(errors.clientSecret).toBeUndefined();
    expect(errors.tokenUrl).toBeUndefined();
  });
});

// ─── hasConnectionErrors ──────────────────────────────────────────────────────

describe('hasConnectionErrors', () => {
  it('is false for a fully valid bearer config', () => {
    const errors = validateConnection(
      makeForm({ url: 'https://mcp.example.com', authType: 'bearer', token: 'abc' }),
    );
    expect(hasConnectionErrors(errors)).toBe(false);
  });

  it('is true when at least one error is present', () => {
    const errors = validateConnection(makeForm({ url: '', token: '' }));
    expect(hasConnectionErrors(errors)).toBe(true);
  });
});

// ─── buildTestConnectionPayload ───────────────────────────────────────────────

describe('buildTestConnectionPayload', () => {
  it('builds bearer credentials and snake_case top-level shape', () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        scope: 'source',
        url: '  https://mcp.example.com  ',
        authType: 'bearer',
        token: 'abc',
        skipSSL: true,
        proxy: true,
        timeout: 45,
      }),
    );

    expect(payload).toEqual({
      scope: 'source',
      url: 'https://mcp.example.com',
      auth_type: 'bearer',
      credentials: { token: 'abc' },
      headers: [],
      skip_ssl: true,
      proxy: true,
      timeout: 45,
    });
  });

  it('maps apiKey credentials to snake_case', () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        url: 'https://mcp.example.com',
        authType: 'apiKey',
        apiKey: 'k',
        apiKeyName: 'X-API-Key',
      }),
    );
    expect(payload.auth_type).toBe('apiKey');
    expect(payload.credentials).toEqual({ api_key: 'k', key_name: 'X-API-Key' });
  });

  it('maps basic credentials', () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        url: 'https://mcp.example.com',
        authType: 'basic',
        username: 'u',
        password: 'p',
      }),
    );
    expect(payload.credentials).toEqual({ username: 'u', password: 'p' });
  });

  it('maps oauth2 credentials to snake_case', () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        url: 'https://mcp.example.com',
        authType: 'oauth2',
        clientId: 'c',
        clientSecret: 's',
        tokenUrl: 'https://auth.example.com/token',
      }),
    );
    expect(payload.credentials).toEqual({
      client_id: 'c',
      client_secret: 's',
      token_url: 'https://auth.example.com/token',
    });
  });

  it('filters out headers with an empty key', () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        url: 'https://mcp.example.com',
        authType: 'bearer',
        token: 'abc',
        headers: [
          { id: 'h-0', key: 'X-Real', value: 'v1' },
          { id: 'h-1', key: '   ', value: 'dropped' },
          { id: 'h-2', key: '', value: 'dropped' },
        ],
      }),
    );
    expect(payload.headers).toEqual([{ key: 'X-Real', value: 'v1' }]);
  });
});
