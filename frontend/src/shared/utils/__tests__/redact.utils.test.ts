import {
  REDACTED,
  maskSecret,
  redactConnection,
  redactLine,
  redactLogs,
} from '@/shared/utils/redact.utils';
import type { MCPConnection } from '@/features/projects/types/project-scope.types';

// ─── redactLine ──────────────────────────────────────────────────────────────

describe('redactLine', () => {
  it('masks a Bearer token', () => {
    expect(redactLine('Authorization: Bearer abc.def-123')).toBe(
      `Authorization: Bearer ${REDACTED}`,
    );
  });

  it('masks token=value', () => {
    expect(redactLine('token=supersecret')).toBe(`token=${REDACTED}`);
  });

  it('masks password: value', () => {
    expect(redactLine('password: hunter2')).toBe(`password: ${REDACTED}`);
  });

  it('masks quoted api_key', () => {
    expect(redactLine('api_key="xyz"')).toBe(`api_key="${REDACTED}"`);
  });

  it('masks Authorization with Bearer prefix', () => {
    expect(redactLine('Authorization: Bearer zzz')).toBe(
      `Authorization: Bearer ${REDACTED}`,
    );
  });

  it('masks Authorization with Basic prefix', () => {
    expect(redactLine('Authorization: Basic dXNlcjpwYXNz')).toBe(
      `Authorization: Basic ${REDACTED}`,
    );
  });

  it('masks a bare Basic credential', () => {
    expect(redactLine('Basic abc123==')).toBe(`Basic ${REDACTED}`);
  });

  it('masks userinfo credentials embedded in a url', () => {
    expect(redactLine('connecting to https://user:secret@host/path')).toBe(
      `connecting to https://${REDACTED}:${REDACTED}@host/path`,
    );
  });

  it('masks userinfo credentials embedded in a proxy string', () => {
    expect(redactLine('proxy http://user:pass@proxy:8080')).toBe(
      `proxy http://${REDACTED}:${REDACTED}@proxy:8080`,
    );
  });

  it('leaves ordinary text untouched', () => {
    const line = 'connecting to https://host/path';
    const result = redactLine(line);
    expect(result).toContain('https://host/path');
    expect(result).toBe(line);
  });
});

// ─── redactLogs ──────────────────────────────────────────────────────────────

describe('redactLogs', () => {
  it('maps redaction over an array of lines', () => {
    const logs = ['token=abc', 'plain line', 'password: pw'];
    expect(redactLogs(logs)).toEqual([
      `token=${REDACTED}`,
      'plain line',
      `password: ${REDACTED}`,
    ]);
  });
});

// ─── maskSecret ──────────────────────────────────────────────────────────────

describe('maskSecret', () => {
  it('returns bullets of equal length', () => {
    expect(maskSecret('abcde')).toBe('•••••');
    expect(maskSecret('abcde')).toHaveLength(5);
  });

  it('returns empty string for empty input', () => {
    expect(maskSecret('')).toBe('');
  });
});

// ─── redactConnection ────────────────────────────────────────────────────────

describe('redactConnection', () => {
  const connection: MCPConnection = {
    scope: 'source',
    url: 'https://erp.example.com',
    token: 'super-secret-token',
    authType: 'bearer',
    headers: [
      { key: 'x-api-key', value: 'leak-me' },
      { key: 'content-type', value: 'application/json' },
    ],
    skipSSL: false,
    proxy: '',
    timeout: 30000,
  };

  it('redacts the token while keeping url and scope intact', () => {
    const result = redactConnection(connection);
    expect(result.token).toBe(REDACTED);
    expect(result.url).toBe('https://erp.example.com');
    expect(result.scope).toBe('source');
  });

  it('redacts secret header values but keeps non-secret headers', () => {
    const result = redactConnection(connection);
    expect(result.headers[0]).toEqual({ key: 'x-api-key', value: REDACTED });
    expect(result.headers[1]).toEqual({
      key: 'content-type',
      value: 'application/json',
    });
  });

  it('leaves a plain url and empty proxy unchanged', () => {
    const result = redactConnection(connection);
    expect(result.url).toBe('https://erp.example.com');
    expect(result.proxy).toBe('');
  });

  it('redacts userinfo credentials in url and proxy', () => {
    const credentialed: MCPConnection = {
      ...connection,
      url: 'https://user:secret@erp.example.com/api',
      proxy: 'http://puser:ppass@proxy.internal:8080',
    };
    const result = redactConnection(credentialed);
    expect(result.url).toBe(
      `https://${REDACTED}:${REDACTED}@erp.example.com/api`,
    );
    expect(result.proxy).toBe(
      `http://${REDACTED}:${REDACTED}@proxy.internal:8080`,
    );
  });
});
