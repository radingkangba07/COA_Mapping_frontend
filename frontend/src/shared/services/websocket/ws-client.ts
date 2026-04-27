import type {
  WSClient,
  WSClientConfig,
  WSClientState,
  WSReconnectConfig,
} from './ws.types';
import { WSCloseReason } from './ws.types';

const DEFAULT_RECONNECT: Required<WSReconnectConfig> = {
  enabled: true,
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

const DEFAULT_PING_INTERVAL_MS = 30_000;

function defaultParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === 'string') return new Error(e);
  return new Error('WebSocket error');
}

function isControlFrame(msg: unknown): boolean {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as Record<string, unknown>).type === 'pong'
  );
}

function resolveReconnect(cfg: WSReconnectConfig | undefined): Required<WSReconnectConfig> {
  if (!cfg) return DEFAULT_RECONNECT;
  const maxAttempts = cfg.maxAttempts ?? DEFAULT_RECONNECT.maxAttempts;
  // `enabled: true` with `maxAttempts <= 0` is a contradictory shape —
  // reconnect is technically disabled but the flag says otherwise. Normalize
  // to the explicit disabled form so scheduleReconnect's gating is unambiguous.
  if (cfg.enabled && maxAttempts <= 0) {
    return { ...DEFAULT_RECONNECT, enabled: false };
  }
  return {
    enabled: cfg.enabled,
    maxAttempts,
    baseDelayMs: cfg.baseDelayMs ?? DEFAULT_RECONNECT.baseDelayMs,
    maxDelayMs: cfg.maxDelayMs ?? DEFAULT_RECONNECT.maxDelayMs,
  };
}

/**
 * Generic WebSocket client with reconnect + keepalive. No feature-specific
 * knowledge — feature wrappers (e.g. job-stream) build the URL and parse the
 * payload; this layer only handles transport concerns.
 */
export function createWSClient<T>(config: WSClientConfig<T>): WSClient {
  const reconnectCfg = resolveReconnect(config.reconnect);
  const pingInterval = config.keepalive?.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS;
  const parse = config.parse ?? defaultParse<T>;

  let socket: WebSocket | null = null;
  let state: WSClientState = 'idle';
  let attempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const clearReconnect = (): void => {
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  };
  const clearPing = (): void => {
    if (pingTimer !== null) { clearInterval(pingTimer); pingTimer = null; }
  };
  const startPing = (): void => {
    clearPing();
    pingTimer = setInterval(() => {
      if (socket !== null && socket.readyState === WebSocket.OPEN) {
        try { socket.send(JSON.stringify({ type: 'ping' })); } catch { /* close/error will surface */ }
      }
    }, pingInterval);
  };

  const scheduleReconnect = (): void => {
    if (!reconnectCfg.enabled) return;
    if (attempts >= reconnectCfg.maxAttempts) return;
    const delay = Math.min(reconnectCfg.maxDelayMs, reconnectCfg.baseDelayMs * 2 ** attempts);
    attempts += 1;
    clearReconnect();
    reconnectTimer = setTimeout(() => { if (!disposed) void connect(); }, delay);
  };

  const resolveUrl = async (): Promise<string> => {
    if (typeof config.url === 'function') return config.url();
    return config.url;
  };

  const connect = async (): Promise<void> => {
    if (disposed) return;
    if (state === 'connecting' || state === 'open') return;
    state = 'connecting';

    let url: string;
    try {
      url = await resolveUrl();
    } catch (e) {
      state = 'closed';
      config.onError?.(toError(e));
      return;
    }

    if (disposed) return;

    try {
      socket = new WebSocket(url);
    } catch (e) {
      state = 'closed';
      config.onError?.(toError(e));
      return;
    }

    socket.onopen = (): void => {
      state = 'open';
      attempts = 0;
      startPing();
      config.onOpen?.();
    };

    socket.onmessage = (ev: MessageEvent): void => {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
      const parsed = parse(raw);
      if (parsed === null) return;
      if (isControlFrame(parsed)) return;
      config.onMessage(parsed);
    };

    socket.onerror = (ev: Event): void => {
      // WS error events are specified as ErrorEvent by the WHATWG spec, so
      // the cast here captures the message when the platform surfaces one.
      const msg = (ev as ErrorEvent).message ?? 'WebSocket error';
      config.onError?.(new Error(msg));
    };

    socket.onclose = (ev: CloseEvent): void => {
      clearPing();
      state = 'closed';
      socket = null;
      config.onClose?.(ev.code);

      const isRecoverable = ev.code === WSCloseReason.NETWORK_DROP;
      if (!disposed && isRecoverable) {
        scheduleReconnect();
      }
    };
  };

  const disconnect = (): void => {
    disposed = true;
    clearReconnect();
    clearPing();
    if (socket !== null && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      try {
        socket.close(WSCloseReason.NORMAL);
      } catch {
        // swallow — already closed
      }
    }
    socket = null;
    state = 'closed';
  };

  const send = (data: object): void => {
    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify(data));
    } catch {
      // swallow — close handler will surface the issue
    }
  };

  return {
    connect,
    disconnect,
    send,
    getState: () => state,
  };
}
