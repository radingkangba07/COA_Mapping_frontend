// ─── Close Codes ────────────────────────────────────────────────────────────

/**
 * WebSocket close codes understood by the client. The backend uses 4401/4403
 * for auth failures; 1000 is a normal close initiated by either side; 1006 is
 * an abnormal close (network drop) that may warrant a reconnect attempt.
 */
export const WSCloseReason = {
  NORMAL: 1000,
  NETWORK_DROP: 1006,
  UNAUTHORIZED: 4401,
  FORBIDDEN: 4403,
} as const;

export type WSCloseReason = (typeof WSCloseReason)[keyof typeof WSCloseReason];

// ─── Client State ───────────────────────────────────────────────────────────

export type WSClientState = 'idle' | 'connecting' | 'open' | 'closed';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface WSReconnectConfig {
  readonly enabled: boolean;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

export interface WSKeepaliveConfig {
  readonly pingIntervalMs?: number;
}

export interface WSClientConfig<T> {
  /**
   * The target URL. May be a function returning a Promise, so the caller can
   * fetch a fresh auth token on every connect attempt.
   */
  readonly url: string | (() => Promise<string>);
  readonly onMessage: (msg: T) => void;
  readonly onOpen?: () => void;
  readonly onClose?: (reason: WSCloseReason | number) => void;
  readonly onError?: (err: Error) => void;
  /**
   * Parse a raw string frame into the domain type. Return `null` to ignore
   * the frame (e.g. control frames like pongs). Defaults to `JSON.parse`.
   */
  readonly parse?: (raw: string) => T | null;
  readonly reconnect?: WSReconnectConfig;
  readonly keepalive?: WSKeepaliveConfig;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export interface WSClient {
  connect(): Promise<void>;
  disconnect(): void;
  send(data: object): void;
  getState(): WSClientState;
}
