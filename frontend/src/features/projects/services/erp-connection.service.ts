// Real backend integration for MCP client connections (POST /api/v1/mcp-clients).
// Credentials are RSA-OAEP encrypted before transmission so they never appear
// as plaintext in the browser network payload.

import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError, Result } from '@/shared/types/result.types';
import { encryptCredentials } from '@/shared/services/crypto/credentials.crypto';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type { McpConnectionForm, McpFormAuthType, McpTestConnectionResult } from './mcp.service';

// ─── Product → erp_id ────────────────────────────────────────────────────────

// Maps the ERP catalogue product IDs (stored in project scope draft) to the
// backend erp_id constraint values.
const PRODUCT_TO_ERP_ID: Record<string, string> = {
  oracle_netsuite: 'netsuite',
  odoo: 'odoo',
  odoo_enterprise: 'odoo',
  tallyprime: 'tally',
};

export function resolveErpId(productId: string | null): string | null {
  if (!productId) return null;
  return PRODUCT_TO_ERP_ID[productId] ?? null;
}

// ─── Auth mapping ─────────────────────────────────────────────────────────────

function mapAuthStrategy(authType: McpFormAuthType): string {
  switch (authType) {
    case 'bearer':
      return 'bearer';
    case 'apiKey':
      return 'api_key';
    case 'tba':
      return 'tba';
    case 'oauth2':
      return 'oauth2';
  }
}

// Public config — stored in DB against the connection record (no secrets).
function buildErpConfig(authType: McpFormAuthType, form: McpConnectionForm): Record<string, unknown> {
  if (authType === 'tba') {
    return { consumer_key: form.consumerKey, token_id: form.tokenId };
  }
  if (authType === 'oauth2') {
    return { client_id: form.clientId };
  }
  if (authType === 'apiKey') {
    const config: Record<string, string> = {};
    if (form.login.trim()) config.login = form.login.trim();
    if (form.dbName.trim()) config.db_name = form.dbName.trim();
    return config;
  }
  return {};
}

// Credentials — passed per-call, never persisted.
function buildCredentials(authType: McpFormAuthType, form: McpConnectionForm): Record<string, string> {
  switch (authType) {
    case 'bearer':
      return { access_token: form.token };
    case 'apiKey':
      return { api_key: form.apiKey };
    case 'tba':
      return {
        consumer_key: form.consumerKey,
        consumer_secret: form.consumerSecret,
        token_id: form.tokenId,
        token_secret: form.tokenSecret,
      };
    case 'oauth2':
      return { access_token: form.token };
  }
}

// ─── OAuth 2.0 flow ───────────────────────────────────────────────────────────

interface OAuth2StartResponse {
  auth_url: string;
  state: string;
}

export async function startOAuth2Flow(
  client: HttpClient,
  clientId: string,
  clientSecret: string,
  baseUrl: string,
): Promise<Result<OAuth2StartResponse, AppError>> {
  try {
    const encrypted = await encryptCredentials({ client_id: clientId, client_secret: clientSecret });
    const { data } = await client.post<OAuth2StartResponse>('/api/v1/mcp-clients/oauth2/start', {
      encrypted_credentials: encrypted,
      base_url: baseUrl,
    });
    return ok(data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

// ─── API shapes ───────────────────────────────────────────────────────────────

interface ConnectionCreateBody {
  label: string;
  erp_id: string;
  connection_role: 'source' | 'target';
  base_url: string;
  auth_strategy: string;
  erp_config: Record<string, unknown>;
}

interface ConnectionRecord {
  id: string;
  version: number;
}

interface TestConnectionBody {
  encrypted_credentials: string;
}

interface TestConnectionResponse {
  success: boolean;
  latency_ms: number;
  error?: string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function createMcpConnection(
  client: HttpClient,
  erpId: string,
  role: 'source' | 'target',
  form: McpConnectionForm,
  label: string,
): Promise<Result<ConnectionRecord, AppError>> {
  const body: ConnectionCreateBody = {
    label,
    erp_id: erpId,
    connection_role: role,
    base_url: form.url.trim(),
    auth_strategy: mapAuthStrategy(form.authType),
    erp_config: buildErpConfig(form.authType, form),
  };
  try {
    const { data } = await client.post<ConnectionRecord>('/api/v1/mcp-clients', body);
    return ok(data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function testMcpConnection(
  client: HttpClient,
  connectionId: string,
  form: McpConnectionForm,
): Promise<Result<McpTestConnectionResult, AppError>> {
  try {
    const body: TestConnectionBody = {
      encrypted_credentials: await encryptCredentials(buildCredentials(form.authType, form)),
    };
    const { data } = await client.post<TestConnectionResponse>(
      `/api/v1/mcp-clients/${connectionId}/test`,
      body,
    );
    if (!data.success) {
      return err({
        code: 'CONNECTION_FAILED',
        message: data.error ?? 'Connection test failed',
        details: {},
      });
    }
    return ok({ connectedAt: new Date().toISOString(), logs: [] });
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
