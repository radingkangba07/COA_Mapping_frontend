// DA-212 (AC: DA-176) — QA: Shared concerns — secret redaction.
// The concretely automatable cross-cutting concern is secret redaction: a fake
// token must never survive into any FE-rendered log/output. (a11y, responsive
// stacking and theme are verified manually / in E2E.)

import {
  REDACTED,
  redactLine,
  redactLogs,
  maskSecret,
  redactConnection,
} from '../redact.utils';
import type { MCPConnection } from '@/features/projects/types/project-scope.types';

const SECRET = 'SECRET123';

describe('DA-212 Secret redaction', () => {
  // Bearer / Basic auth schemes
  it('redacts Bearer and Basic auth tokens', () => {
    expect(redactLine(`Authorization: Bearer ${SECRET}`)).toBe('Authorization: Bearer ***');
    expect(redactLine(`Authorization: Basic ${SECRET}==`)).toBe('Authorization: Basic ***');
    expect(redactLine(`Authorization: Bearer ${SECRET}`)).not.toContain(SECRET);
  });

  // key=value / key: "value" secret pairs
  it('redacts secret key/value pairs (token, password, api_key, secret, x-api-key)', () => {
    for (const line of [
      `token=${SECRET}`,
      `password: ${SECRET}`,
      `api_key="${SECRET}"`,
      `secret=${SECRET}`,
      `x-api-key: ${SECRET}`,
    ]) {
      const out = redactLine(line);
      expect(out).toContain(REDACTED);
      expect(out).not.toContain(SECRET);
    }
  });

  // Credentials embedded in a URL
  it('redacts userinfo credentials embedded in a URL', () => {
    const out = redactLine(`connecting to https://admin:${SECRET}@mcp.example.com`);
    expect(out).toContain('***:***@');
    expect(out).not.toContain(SECRET);
  });

  // Non-secret text is left intact
  it('leaves non-secret text untouched', () => {
    expect(redactLine('connecting to https://mcp.example.com')).toBe('connecting to https://mcp.example.com');
  });

  // redactLogs redacts every line
  it('redacts every line and never leaks the literal secret', () => {
    const logs = [`Bearer ${SECRET}`, `password=${SECRET}`, 'handshake ok'];
    const out = redactLogs(logs);
    expect(out.join('\n')).not.toContain(SECRET);
    expect(out.join('\n')).toContain(REDACTED);
    expect(out).toHaveLength(3);
  });

  // maskSecret produces equal-length bullets (for show/hide inputs)
  it('masks a secret into equal-length bullets', () => {
    const masked = maskSecret(SECRET);
    expect(masked).toHaveLength(SECRET.length);
    expect(masked).not.toContain(SECRET);
    expect(masked).toMatch(/^•+$/);
  });

  // redactConnection masks token + secret headers + url/proxy credentials
  it('returns a log-safe connection with token, secret headers and url/proxy redacted', () => {
    const conn = {
      scope: 'source',
      url: `https://admin:${SECRET}@mcp.example.com`,
      token: SECRET,
      authType: 'bearer',
      headers: [
        { key: 'X-API-Key', value: SECRET },
        { key: 'X-Trace-Id', value: 'trace-abc' },
      ],
      skipSSL: false,
      proxy: `http://proxyuser:${SECRET}@proxy.local`,
      timeout: 30000,
    } as unknown as MCPConnection;

    const safe = redactConnection(conn);
    const blob = JSON.stringify(safe);

    expect(safe.token).toBe(REDACTED);
    expect(safe.url).toContain('***:***@');
    expect(safe.proxy).toContain('***:***@');
    // Secret-keyed header value masked; non-secret header value preserved.
    expect(safe.headers.find((h) => h.key === 'X-API-Key')?.value).toBe(REDACTED);
    expect(safe.headers.find((h) => h.key === 'X-Trace-Id')?.value).toBe('trace-abc');
    // The literal secret never appears anywhere in the log-safe view.
    expect(blob).not.toContain(SECRET);
  });
});
