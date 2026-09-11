// DA-91 — Cross-cutting INTEGRATION test for the MCP connection
// validation + payload + gating logic. Exercises the REAL service functions
// (mcp.service) together with the REAL project-scope store/selectors, rather
// than re-rendering individual components (those have their own unit suites).
// Pure-logic + store tests — no React rendering, so no theme/icon/nav mocks.

import {
  createInitialMcpForm,
  validateConnection,
  hasConnectionErrors,
  buildTestConnectionPayload,
  type McpConnectionForm,
  type McpFormHeader,
} from '../../services/mcp.service';
import { useProjectScopeStore } from '../../store/project-scope.store';
import { selectCanCreateProject } from '../../store/project-scope.selectors';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeForm(overrides: Partial<McpConnectionForm> = {}): McpConnectionForm {
  return { ...createInitialMcpForm(), ...overrides };
}

const VALID_URL = 'https://mcp.example.com';
const VALID_TOKEN_URL = 'https://auth.example.com/token';

function header(
  id: string,
  key: string,
  value: string,
): McpFormHeader {
  return { id, key, value };
}

// ─── 1. Conditional AUTH FIELDS validation ────────────────────────────────────

describe('validateConnection — conditional auth fields', () => {
  describe('a valid URL is required in all cases', () => {
    const authTypes: readonly McpConnectionForm['authType'][] = [
      'bearer',
      'apiKey',
      'tba',
      'oauth2',
    ];

    it.each(authTypes)('flags an empty URL for authType=%s', (authType) => {
      const errors = validateConnection(makeForm({ authType, url: '' }));
      expect(errors.url).toBeDefined();
      expect(hasConnectionErrors(errors)).toBe(true);
    });

    it.each(authTypes)('flags an invalid URL for authType=%s', (authType) => {
      const errors = validateConnection(makeForm({ authType, url: 'notaurl' }));
      expect(errors.url).toBeDefined();
    });

    it.each(authTypes)('accepts a valid URL for authType=%s', (authType) => {
      const errors = validateConnection(makeForm({ authType, url: VALID_URL }));
      expect(errors.url).toBeUndefined();
    });
  });

  describe("authType='bearer'", () => {
    it('flags a missing token, and clears it once supplied', () => {
      const missing = validateConnection(
        makeForm({ authType: 'bearer', url: VALID_URL, token: '' }),
      );
      expect(missing.token).toBeDefined();
      expect(hasConnectionErrors(missing)).toBe(true);

      const supplied = validateConnection(
        makeForm({ authType: 'bearer', url: VALID_URL, token: 'secret-token' }),
      );
      expect(supplied.token).toBeUndefined();
      expect(hasConnectionErrors(supplied)).toBe(false);
    });

    it('treats a whitespace-only token as missing', () => {
      const errors = validateConnection(
        makeForm({ authType: 'bearer', url: VALID_URL, token: '   ' }),
      );
      expect(errors.token).toBeDefined();
    });
  });

  describe("authType='apiKey'", () => {
    it('flags apiKey when missing', () => {
      const errors = validateConnection(
        makeForm({
          authType: 'apiKey',
          url: VALID_URL,
          apiKey: '',
        }),
      );
      expect(errors.apiKey).toBeDefined();
      expect(hasConnectionErrors(errors)).toBe(true);
    });

    it('clears the error once apiKey is supplied', () => {
      const errors = validateConnection(
        makeForm({
          authType: 'apiKey',
          url: VALID_URL,
          apiKey: 'abc123',
        }),
      );
      expect(errors.apiKey).toBeUndefined();
      expect(hasConnectionErrors(errors)).toBe(false);
    });
  });

  describe("authType='tba'", () => {
    it('flags all four tba fields when missing', () => {
      const errors = validateConnection(
        makeForm({
          authType: 'tba',
          url: VALID_URL,
          consumerKey: '',
          consumerSecret: '',
          tokenId: '',
          tokenSecret: '',
        }),
      );
      expect(errors.consumerKey).toBeDefined();
      expect(errors.consumerSecret).toBeDefined();
      expect(errors.tokenId).toBeDefined();
      expect(errors.tokenSecret).toBeDefined();
      expect(hasConnectionErrors(errors)).toBe(true);
    });

    it('clears the errors once all tba fields are supplied', () => {
      const errors = validateConnection(
        makeForm({
          authType: 'tba',
          url: VALID_URL,
          consumerKey: 'ck',
          consumerSecret: 'cs',
          tokenId: 'ti',
          tokenSecret: 'ts',
        }),
      );
      expect(errors.consumerKey).toBeUndefined();
      expect(errors.consumerSecret).toBeUndefined();
      expect(errors.tokenId).toBeUndefined();
      expect(errors.tokenSecret).toBeUndefined();
      expect(hasConnectionErrors(errors)).toBe(false);
    });
  });

  describe("authType='oauth2'", () => {
    it('flags missing clientId and access token', () => {
      const errors = validateConnection(
        makeForm({
          authType: 'oauth2',
          url: VALID_URL,
          clientId: '',
          token: '',
        }),
      );
      expect(errors.clientId).toBeDefined();
      expect(errors.token).toBeDefined();
      expect(hasConnectionErrors(errors)).toBe(true);
    });

    it('clears all errors once clientId and access token are supplied', () => {
      const errors = validateConnection(
        makeForm({
          authType: 'oauth2',
          url: VALID_URL,
          clientId: 'client-1',
          clientSecret: 'client-secret',
          token: 'access-token',
        }),
      );
      expect(hasConnectionErrors(errors)).toBe(false);
    });
  });
});

// ─── 2. HEADER ROWS + credentials in the test-connection payload ──────────────

describe('buildTestConnectionPayload — header rows', () => {
  it('filters out blank-key header rows and keeps non-blank ones as {key,value}', () => {
    const conn = makeForm({
      authType: 'bearer',
      url: VALID_URL,
      token: 'tok',
      headers: [
        header('h1', 'X-Trace', 'abc'),
        header('h2', '', 'orphan-value'),
        header('h3', '   ', 'whitespace-key'),
        header('h4', 'X-Env', 'staging'),
      ],
    });

    const payload = buildTestConnectionPayload(conn);

    expect(payload.headers).toEqual([
      { key: 'X-Trace', value: 'abc' },
      { key: 'X-Env', value: 'staging' },
    ]);
  });

  it('returns an empty headers array when there are no rows', () => {
    const payload = buildTestConnectionPayload(
      makeForm({ authType: 'bearer', url: VALID_URL, token: 'tok' }),
    );
    expect(payload.headers).toEqual([]);
  });
});

describe('buildTestConnectionPayload — credentials per authType', () => {
  it("bearer -> { token }", () => {
    const payload = buildTestConnectionPayload(
      makeForm({ authType: 'bearer', url: VALID_URL, token: 'tok' }),
    );
    expect(payload.auth_type).toBe('bearer');
    expect(payload.credentials).toEqual({ token: 'tok' });
  });

  it("apiKey -> { api_key, key_name }", () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        authType: 'apiKey',
        url: VALID_URL,
        apiKey: 'abc123',
        apiKeyName: 'X-Api-Key',
      }),
    );
    expect(payload.auth_type).toBe('apiKey');
    expect(payload.credentials).toEqual({
      api_key: 'abc123',
      key_name: 'X-Api-Key',
    });
  });

  it("basic -> { username, password }", () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        authType: 'tba',
        url: VALID_URL,
        consumerKey: 'ck',
        tokenId: 'ti',
      }),
    );
    expect(payload.auth_type).toBe('tba');
    expect(payload.credentials).toEqual({
      consumer_key: 'ck',
      token_id: 'ti',
    });
  });

  it("oauth2 -> { client_id, access_token }", () => {
    const payload = buildTestConnectionPayload(
      makeForm({
        authType: 'oauth2',
        url: VALID_URL,
        clientId: 'client-1',
        token: 'access-token-xyz',
      }),
    );
    expect(payload.auth_type).toBe('oauth2');
    expect(payload.credentials).toEqual({
      client_id: 'client-1',
      access_token: 'access-token-xyz',
    });
  });
});

describe('buildTestConnectionPayload — passthrough fields', () => {
  it('trims the url and passes scope/skip_ssl/proxy/timeout through unchanged', () => {
    const conn = makeForm({
      scope: 'target',
      authType: 'bearer',
      url: '  https://mcp.example.com  ',
      token: 'tok',
      skipSSL: true,
      proxy: true,
      timeout: 120,
    });

    const payload = buildTestConnectionPayload(conn);

    expect(payload.url).toBe(VALID_URL);
    expect(payload.scope).toBe('target');
    expect(payload.skip_ssl).toBe(true);
    expect(payload.proxy).toBe(true);
    expect(payload.timeout).toBe(120);
  });
});

// ─── 3. VALIDATION -> GATING integration via the REAL store ───────────────────

describe('validation -> gating integration', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('an invalid connection form yields hasConnectionErrors=true (the VM canTest gate)', () => {
    const errors = validateConnection(makeForm({ url: '', token: '' }));
    expect(hasConnectionErrors(errors)).toBe(true);

    const valid = validateConnection(
      makeForm({ authType: 'bearer', url: VALID_URL, token: 'tok' }),
    );
    expect(hasConnectionErrors(valid)).toBe(false);
  });

  it('mcp/mcp: canCreate is FALSE until the single shared connection is ready', () => {
    const store = useProjectScopeStore.getState();
    store.setCompanyId('company-1');
    store.setSource('sap');
    store.setTarget('netsuite');
    store.setSourceMethod('mcp');
    store.setTargetMethod('mcp');

    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);

    // A single successful test connection opens the gate for both MCP sides.
    useProjectScopeStore.getState().setConnectionReady(true);
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);
  });

  it('csv/csv: canCreate is TRUE without any test connection', () => {
    const store = useProjectScopeStore.getState();
    store.setCompanyId('company-1');
    store.setSource('sap');
    store.setTarget('netsuite');
    store.setSourceMethod('csv');
    store.setTargetMethod('csv');

    expect(selectConnectionReadyFalse()).toBe(false);
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);
  });

  it('mixed csv/mcp: the mcp side still requires the shared connection ready flag', () => {
    const store = useProjectScopeStore.getState();
    store.setCompanyId('company-1');
    store.setSource('sap');
    store.setTarget('netsuite');
    store.setSourceMethod('csv');
    store.setTargetMethod('mcp');

    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);

    store.setConnectionReady(true);
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);
  });

  it('canCreate stays FALSE when company is missing even if the connection is ready', () => {
    const store = useProjectScopeStore.getState();
    store.setSource('sap');
    store.setTarget('netsuite');
    store.setSourceMethod('mcp');
    store.setTargetMethod('mcp');
    store.setConnectionReady(true);

    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);
  });

  it('canCreate stays FALSE when both ERPs are identical (not distinct)', () => {
    const store = useProjectScopeStore.getState();
    store.setCompanyId('company-1');
    store.setSource('sap');
    store.setTarget('sap');

    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);
  });
});

// Local assertion helper: connectionReady defaults to false after reset.
function selectConnectionReadyFalse(): boolean {
  return useProjectScopeStore.getState().connectionReady;
}
