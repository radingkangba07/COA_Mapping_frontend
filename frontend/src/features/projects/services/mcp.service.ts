// Form model, field-level validation, and test-connection payload builder for
// the MCP Connection Details panel (DA-49/DA-67). The DA-53 shared contract
// `MCPConnection` is leaner; the panel needs a richer model (OAuth2, per-auth
// credentials, applicability scope), so it owns its own form type here. Pure TS.

import { AxiosError } from 'axios';
import { z } from 'zod';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError, Result } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type {
  CoaRow,
  MCPConnectionPayload,
  MigrationScopePayload,
} from '../types/project-scope.types';

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

export const DEFAULT_TIMEOUT_SECONDS = 60;

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

// ─── Test Connection (DA-69) ──────────────────────────────────────────────────

// The backend returns a timestamp plus optional logs. Be tolerant of field
// naming: accept `timestamp` OR `connected_at`, and treat logs as optional.
const testConnectionResponseSchema = z.object({
  timestamp: z.string().optional(),
  connected_at: z.string().optional(),
  logs: z.array(z.string()).optional(),
});

export interface McpTestConnectionResult {
  readonly connectedAt: string; // ISO timestamp (from timestamp ?? connected_at)
  readonly logs: readonly string[]; // [] when absent
}

// Extracts server-provided log lines from a failed request so the failure
// panel/drawer can render them. Narrows safely without `any`.
function extractErrorLogs(error: unknown): string[] {
  if (!(error instanceof AxiosError)) {
    return [];
  }
  const responseData: unknown = error.response?.data;
  if (typeof responseData !== 'object' || responseData === null) {
    return [];
  }
  const logs: unknown = (responseData as Record<string, unknown>).logs;
  if (!Array.isArray(logs)) {
    return [];
  }
  return logs.every((line): line is string => typeof line === 'string')
    ? logs
    : [];
}

// POSTs the test-connection request to the MCP surface (NOT under /api/v1) and
// resolves the parsed result. DA-70+ render the success/failure UI from this.
export async function testConnection(
  client: HttpClient,
  payload: McpTestConnectionPayload,
): Promise<Result<McpTestConnectionResult, AppError>> {
  try {
    const { data } = await client.post<unknown>(
      '/mcp/test-connection',
      payload,
    );
    const parsed = testConnectionResponseSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Test connection response failed validation',
        details: { issues: parsed.error.issues },
      });
    }
    const connectedAt =
      parsed.data.timestamp ??
      parsed.data.connected_at ??
      new Date().toISOString();
    return ok({ connectedAt, logs: parsed.data.logs ?? [] });
  } catch (error: unknown) {
    const appError = toAppError(error);
    const serverLogs = extractErrorLogs(error);
    return err(
      serverLogs.length > 0
        ? { ...appError, details: { ...appError.details, logs: serverLogs } }
        : appError,
    );
  }
}

// ─── Fetch COA (DA-80) ────────────────────────────────────────────────────────

export interface FetchCoaPayload {
  source_erp: string | null;
  target_erp: string | null;
  scope: MigrationScopePayload;
  connection: MCPConnectionPayload;
}

export interface FetchCoaResult {
  readonly source: readonly CoaRow[];
  readonly target: readonly CoaRow[];
}

// The backend shape is not fully settled yet, so be tolerant: accept explicit
// `source`/`target` arrays, OR a flat `rows` array (treated as source), plus an
// optional `counts` block. Each row is an open record so dynamic CSV-style
// columns survive into CoaRow (a structural superset of the CSV parser row).
const coaRowSchema = z.record(z.string(), z.unknown());

const fetchCoaResponseSchema = z
  .object({
    source: z.array(coaRowSchema).optional(),
    target: z.array(coaRowSchema).optional(),
    rows: z.array(coaRowSchema).optional(),
    counts: z
      .object({
        source: z.number().optional(),
        target: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

// Reads the first present key from `raw` and returns it as a string, else null.
// Narrows safely without `any` (string | number values are coerced).
function pickString(
  raw: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return null;
}

// Normalizes a raw response row into a CoaRow. Spreads `raw` first to preserve
// dynamic CSV-style columns, then overlays normalized fields so they win.
function toCoaRow(raw: Record<string, unknown>): CoaRow {
  const accountCode =
    pickString(raw, ['accountCode', 'account_code', 'code', 'account_number']) ??
    '';
  const accountName =
    pickString(raw, ['accountName', 'account_name', 'name', 'description']) ?? '';
  const accountType =
    pickString(raw, ['accountType', 'account_type', 'type']) ?? '';
  const parent = pickString(raw, ['parent', 'parent_code', 'parent_account']);
  return { ...raw, accountCode, accountName, accountType, parent };
}

// POSTs the fetch-COA request to the MCP surface (NOT under /api/v1) and resolves
// the normalized source/target rows. DA-81 derives counts + samples from this;
// DA-84 feeds the result into the migration store.
export async function fetchCoa(
  client: HttpClient,
  payload: FetchCoaPayload,
): Promise<Result<FetchCoaResult, AppError>> {
  try {
    const { data } = await client.post<unknown>('/mcp/fetch-coa', payload);
    const parsed = fetchCoaResponseSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Fetch COA response failed validation',
        details: { issues: parsed.error.issues },
      });
    }
    const hasExplicit =
      parsed.data.source !== undefined || parsed.data.target !== undefined;
    const sourceRaw = hasExplicit
      ? parsed.data.source ?? []
      : parsed.data.rows ?? [];
    const targetRaw = hasExplicit ? parsed.data.target ?? [] : [];
    return ok({
      source: sourceRaw.map(toCoaRow),
      target: targetRaw.map(toCoaRow),
    });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
