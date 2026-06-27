// Form model, field-level validation, and test-connection payload builder for
// the MCP Connection Details panel (DA-49/DA-67). The DA-53 shared contract
// `MCPConnection` is leaner; the panel needs a richer model (OAuth2, per-auth
// credentials, applicability scope), so it owns its own form type here. Pure TS.

export type McpFormAuthType = 'bearer' | 'apiKey' | 'basic' | 'oauth2';

export type McpConfigureScope = 'source' | 'target' | 'both';

export interface McpFormHeader {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

export interface McpConnectionForm {
  readonly scope: McpConfigureScope;
  readonly url: string;
  readonly authType: McpFormAuthType;
  // bearer
  readonly token: string;
  // apiKey
  readonly apiKey: string;
  readonly apiKeyName: string;
  // basic
  readonly username: string;
  readonly password: string;
  // oauth2
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tokenUrl: string;
  // shared
  readonly headers: readonly McpFormHeader[];
  readonly skipSSL: boolean;
  readonly proxy: boolean;
  readonly timeout: number; // seconds
}

const DEFAULT_TIMEOUT_SECONDS = 60;

// Single source of truth for MCP server URL validity. Later subtasks'
// validate(conn) reuse this rather than re-implementing the rule.
export function isValidMcpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    return isHttp && parsed.host.length > 0;
  } catch {
    return false;
  }
}

export interface McpConnectionErrors {
  url?: string;
  token?: string;
  apiKey?: string;
  apiKeyName?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
}

// Field-level validation for the MCP connection form (DA-67). All validation
// logic lives here; the panel only surfaces the returned keys that have errors.
export function validateConnection(
  conn: McpConnectionForm,
): McpConnectionErrors {
  const errors: McpConnectionErrors = {};
  const isEmpty = (value: string): boolean => value.trim().length === 0;

  if (!isValidMcpUrl(conn.url)) {
    errors.url = 'Enter a valid http(s) URL';
  }

  switch (conn.authType) {
    case 'bearer':
      if (isEmpty(conn.token)) errors.token = 'Access token is required';
      break;
    case 'apiKey':
      if (isEmpty(conn.apiKey)) errors.apiKey = 'API key is required';
      if (isEmpty(conn.apiKeyName)) errors.apiKeyName = 'Key name is required';
      break;
    case 'basic':
      if (isEmpty(conn.username)) errors.username = 'Username is required';
      if (isEmpty(conn.password)) errors.password = 'Password is required';
      break;
    case 'oauth2':
      if (isEmpty(conn.clientId)) errors.clientId = 'Client ID is required';
      if (isEmpty(conn.clientSecret))
        errors.clientSecret = 'Client secret is required';
      if (!isValidMcpUrl(conn.tokenUrl))
        errors.tokenUrl = 'Enter a valid token URL';
      break;
  }

  return errors;
}

export function hasConnectionErrors(errors: McpConnectionErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type McpAuthCredentials =
  | { readonly token: string }
  | { readonly api_key: string; readonly key_name: string }
  | { readonly username: string; readonly password: string }
  | {
      readonly client_id: string;
      readonly client_secret: string;
      readonly token_url: string;
    };

export interface McpTestConnectionHeader {
  readonly key: string;
  readonly value: string;
}

export interface McpTestConnectionPayload {
  readonly scope: McpConfigureScope;
  readonly url: string;
  readonly auth_type: McpFormAuthType;
  readonly credentials: McpAuthCredentials;
  readonly headers: readonly McpTestConnectionHeader[];
  readonly skip_ssl: boolean;
  readonly proxy: boolean;
  readonly timeout: number;
}

function buildCredentials(conn: McpConnectionForm): McpAuthCredentials {
  switch (conn.authType) {
    case 'bearer':
      return { token: conn.token };
    case 'apiKey':
      return { api_key: conn.apiKey, key_name: conn.apiKeyName };
    case 'basic':
      return { username: conn.username, password: conn.password };
    case 'oauth2':
      return {
        client_id: conn.clientId,
        client_secret: conn.clientSecret,
        token_url: conn.tokenUrl,
      };
  }
}

// Builds the snake_case request BODY (secrets included) for the MCP
// test-connection endpoint. DA-50 reuses this to call the endpoint.
export function buildTestConnectionPayload(
  conn: McpConnectionForm,
): McpTestConnectionPayload {
  return {
    scope: conn.scope,
    url: conn.url.trim(),
    auth_type: conn.authType,
    credentials: buildCredentials(conn),
    headers: conn.headers
      .filter((h) => h.key.trim() !== '')
      .map((h) => ({ key: h.key, value: h.value })),
    skip_ssl: conn.skipSSL,
    proxy: conn.proxy,
    timeout: conn.timeout,
  };
}

export function createInitialMcpForm(): McpConnectionForm {
  return {
    scope: 'both',
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
    timeout: DEFAULT_TIMEOUT_SECONDS,
  };
}
