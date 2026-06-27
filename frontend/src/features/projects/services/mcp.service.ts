// Local form model for the MCP Connection Details panel (DA-49).
// The DA-53 shared contract `MCPConnection` is intentionally leaner; the panel
// needs a richer model (OAuth2, per-auth credentials, source/target tabs), so it
// owns its own form type here. Later subtasks extend this service with
// validation + payload-building. Pure TS — no React, no UI imports.

export type McpFormAuthType = 'bearer' | 'apiKey' | 'basic' | 'oauth2';

export type McpConfigureScope = 'source' | 'target' | 'both';

export type McpActiveTab = 'source' | 'target';

export interface McpFormHeader {
  readonly id: string;
  readonly key: string;
  readonly value: string;
}

export interface McpConnectionForm {
  readonly scope: McpConfigureScope;
  readonly activeTab: McpActiveTab;
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

export function createInitialMcpForm(): McpConnectionForm {
  return {
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
    timeout: DEFAULT_TIMEOUT_SECONDS,
  };
}
