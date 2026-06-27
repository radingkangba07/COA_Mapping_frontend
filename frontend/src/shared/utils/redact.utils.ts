import type {
  McpAuthType,
  McpScope,
  MCPConnection,
} from '@/features/projects/types/project-scope.types';

export const REDACTED = '***';

const BEARER_PATTERN = /(Bearer\s+)[\w.\-]+/gi;

const BASIC_PATTERN = /(Basic\s+)[\w+/=.\-]+/gi;

// scheme://user:pass@  →  scheme://***:***@  (only when userinfo is present)
const URL_USERINFO_PATTERN = /([a-z][a-z0-9+.\-]*:\/\/)[^/@\s:]+:[^/@\s]+@/gi;

const SECRET_KEY_VALUE_PATTERN =
  /((?:password|passwd|pwd|token|secret|api[_-]?key|authorization|x-api-key)["']?\s*[:=]\s*["']?)([^"'\s,}&]+)/gi;

const SECRET_KEY_PATTERN =
  /^(?:password|passwd|pwd|token|secret|api[_-]?key|authorization|x-api-key)$/i;

/** Redacts embedded `scheme://user:pass@` credentials in a single string. */
function redactUrlUserinfo(value: string): string {
  return value.replace(
    URL_USERINFO_PATTERN,
    (_match, scheme: string) => `${scheme}${REDACTED}:${REDACTED}@`,
  );
}

/** Replaces any secrets in a single string so it can be safely rendered as a log line. */
export function redactLine(line: string): string {
  return redactUrlUserinfo(
    line
      .replace(BEARER_PATTERN, `$1${REDACTED}`)
      .replace(BASIC_PATTERN, `$1${REDACTED}`)
      .replace(SECRET_KEY_VALUE_PATTERN, (_match, prefix: string, value: string) =>
        // The Bearer/Basic rules already own the token after a scheme keyword;
        // don't redact the scheme keyword itself or we lose the `Bearer ***` shape.
        value.toLowerCase() === 'bearer' || value.toLowerCase() === 'basic'
          ? `${prefix}${value}`
          : `${prefix}${REDACTED}`,
      ),
  );
}

/** Redacts every line in a collection of log lines. */
export function redactLogs(logs: readonly string[]): string[] {
  return logs.map(redactLine);
}

/** Masks a secret value into a bullet string of equal length for show/hide inputs. */
export function maskSecret(value: string): string {
  return '•'.repeat(value.length);
}

// ─── Redacted Connection View ────────────────────────────────────────────────

export interface RedactedHeader {
  readonly key: string;
  readonly value: string;
}

/** A log-safe view of an MCPConnection: token and credentialed url/proxy/headers masked. */
export interface RedactedConnection {
  readonly scope: McpScope;
  readonly url: string;
  readonly token: string;
  readonly authType: McpAuthType;
  readonly headers: readonly RedactedHeader[];
  readonly skipSSL: boolean;
  readonly proxy: string;
  readonly timeout: number;
}

/**
 * Returns a log-safe copy of a connection with the token, any secret-keyed header
 * values, and any url/proxy userinfo credentials replaced by REDACTED.
 */
export function redactConnection(conn: MCPConnection): RedactedConnection {
  const headers: RedactedHeader[] = conn.headers.map((header) => ({
    key: header.key,
    value: SECRET_KEY_PATTERN.test(header.key) ? REDACTED : header.value,
  }));

  return {
    scope: conn.scope,
    url: redactUrlUserinfo(conn.url),
    token: REDACTED,
    authType: conn.authType,
    headers,
    skipSSL: conn.skipSSL,
    proxy: redactUrlUserinfo(conn.proxy),
    timeout: conn.timeout,
  };
}
