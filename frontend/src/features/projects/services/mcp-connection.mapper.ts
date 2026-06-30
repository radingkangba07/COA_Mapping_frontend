// Projects the rich panel form (McpConnectionForm) onto the lean DA-53
// MCPConnection that the project-scope draft serializes per side (DA-48). The
// lean shape carries no OAuth2/api-key credential fields, so this is a
// deliberately lossy projection used only for draft serialization — the full
// form remains the source of truth for testing the connection.

import type { McpAuthType, McpScope, MCPConnection } from '../types/project-scope.types';
import type { McpConnectionForm, McpFormAuthType } from './mcp.service';

const SECONDS_TO_MS = 1000;

// The lean MCPConnection has no 'oauth2' member; map it to the closest
// token-bearing type so serialization stays well-typed.
function toLeanAuthType(authType: McpFormAuthType): McpAuthType {
  switch (authType) {
    case 'bearer':
      return 'bearer';
    case 'basic':
      return 'basic';
    case 'apiKey':
      return 'apiKey';
    case 'oauth2':
      return 'bearer';
  }
}

export function mcpFormToConnection(
  form: McpConnectionForm,
  scope: McpScope,
): MCPConnection {
  return {
    scope,
    url: form.url,
    token: form.token,
    authType: toLeanAuthType(form.authType),
    headers: form.headers.map((header) => ({
      key: header.key,
      value: header.value,
    })),
    skipSSL: form.skipSSL,
    proxy: form.proxy ? 'enabled' : '',
    timeout: form.timeout * SECONDS_TO_MS,
  };
}
