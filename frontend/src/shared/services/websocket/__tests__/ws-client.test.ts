import { createWSClient } from '../ws-client';
import { WSCloseReason } from '../ws.types';

// ─── Mock WebSocket ────────────────────────────────────────────────────────

interface MockSocketInstance {
  readyState: number;
  url: string;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: { code: number }) => void) | null;
  send: jest.Mock;
  close: jest.Mock;
}

const sockets: MockSocketInstance[] = [];
let throwOnConstruct = false;

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public url: string;
  public onopen: ((ev: unknown) => void) | null = null;
  public onmessage: ((ev: { data: string }) => void) | null = null;
  public onerror: ((ev: unknown) => void) | null = null;
  public onclose: ((ev: { code: number }) => void) | null = null;
  public send = jest.fn();
  public close = jest.fn((code?: number) => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: code ?? WSCloseReason.NORMAL });
  });

  constructor(url: string) {
    this.url = url;
    if (throwOnConstruct) throw new Error('ctor boom');
    sockets.push(this as unknown as MockSocketInstance);
  }
}

beforeAll(() => {
  (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket =
    MockWebSocket;
});

beforeEach(() => {
  sockets.length = 0;
  throwOnConstruct = false;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

function latestSocket(): MockSocketInstance {
  const s = sockets[sockets.length - 1];
  if (!s) throw new Error('No socket instantiated');
  return s;
}

function openLatest(): void {
  const s = latestSocket();
  s.readyState = MockWebSocket.OPEN;
  s.onopen?.({});
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('createWSClient — open + onMessage', () => {
  it('fires onOpen when the socket opens', async () => {
    const onOpen = jest.fn();
    const client = createWSClient<{ foo: string }>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      onOpen,
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(client.getState()).toBe('open');
  });

  it('parses valid JSON messages and passes them to onMessage', async () => {
    const onMessage = jest.fn();
    const client = createWSClient<{ foo: string }>({
      url: 'ws://test/path',
      onMessage,
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();
    latestSocket().onmessage?.({ data: JSON.stringify({ foo: 'bar' }) });
    expect(onMessage).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('ignores invalid JSON without crashing and without calling onMessage', async () => {
    const onMessage = jest.fn();
    const client = createWSClient<{ foo: string }>({
      url: 'ws://test/path',
      onMessage,
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();
    expect(() =>
      latestSocket().onmessage?.({ data: 'not-json' }),
    ).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('ignores pong control frames', async () => {
    const onMessage = jest.fn();
    const client = createWSClient<{ type?: string; foo?: string }>({
      url: 'ws://test/path',
      onMessage,
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();
    latestSocket().onmessage?.({ data: JSON.stringify({ type: 'pong' }) });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('uses a custom parser when provided', async () => {
    const onMessage = jest.fn();
    const parse = jest.fn((raw: string) => ({ parsed: raw.length }));
    const client = createWSClient<{ parsed: number }>({
      url: 'ws://test/path',
      onMessage,
      parse,
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();
    latestSocket().onmessage?.({ data: 'abc' });
    expect(parse).toHaveBeenCalledWith('abc');
    expect(onMessage).toHaveBeenCalledWith({ parsed: 3 });
  });
});

describe('createWSClient — reconnect on 1006', () => {
  it('schedules a reconnect after 1006 close', async () => {
    const onClose = jest.fn();
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      onClose,
      reconnect: { enabled: true, maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30_000 },
    });
    await client.connect();
    openLatest();
    expect(sockets).toHaveLength(1);

    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });
    expect(onClose).toHaveBeenCalledWith(WSCloseReason.NETWORK_DROP);

    // First attempt: 1000ms
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(sockets).toHaveLength(2);
  });

  it('uses exponential backoff doubling, capped by maxDelayMs', async () => {
    // Simulate repeated failures without ever opening — the attempt counter
    // only resets on onopen, so the delays grow 1000 → 2000 → 4000 (cap).
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: true, maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 4000 },
    });
    await client.connect();
    // Initial socket never opens — close immediately to schedule reconnect #1
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });

    // attempt index 0 → 1000ms
    jest.advanceTimersByTime(999);
    await Promise.resolve();
    expect(sockets).toHaveLength(1);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(sockets).toHaveLength(2);
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });

    // attempt index 1 → 2000ms
    jest.advanceTimersByTime(1999);
    await Promise.resolve();
    expect(sockets).toHaveLength(2);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(sockets).toHaveLength(3);
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });

    // attempt index 2 → 4000ms (2000 * 2 = 4000, equals cap)
    jest.advanceTimersByTime(3999);
    await Promise.resolve();
    expect(sockets).toHaveLength(3);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(sockets).toHaveLength(4);
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });

    // attempt index 3 → 8000 capped to 4000
    jest.advanceTimersByTime(3999);
    await Promise.resolve();
    expect(sockets).toHaveLength(4);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(sockets).toHaveLength(5);
  });

  it('stops reconnecting after maxAttempts is reached', async () => {
    // Never open — count reconnect attempts cleanly.
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: true, maxAttempts: 2, baseDelayMs: 1000, maxDelayMs: 30_000 },
    });
    await client.connect();

    // initial + attempt 0
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(sockets).toHaveLength(2);

    // attempt 1
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(sockets).toHaveLength(3);

    // maxAttempts exhausted — further closes should not reconnect
    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(sockets).toHaveLength(3);
  });
});

describe('createWSClient — no reconnect on terminal codes', () => {
  it.each([
    ['4401 Unauthorized', WSCloseReason.UNAUTHORIZED],
    ['4403 Forbidden', WSCloseReason.FORBIDDEN],
    ['1000 Normal', WSCloseReason.NORMAL],
  ])('does not reconnect after %s close', async (_label, code) => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: true, maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30_000 },
    });
    await client.connect();
    openLatest();

    latestSocket().onclose?.({ code });
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(sockets).toHaveLength(1);
  });
});

describe('createWSClient — disconnect cleanup', () => {
  it('cancels pending reconnect timer when disconnect is called', async () => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: true, maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 30_000 },
    });
    await client.connect();
    openLatest();

    latestSocket().onclose?.({ code: WSCloseReason.NETWORK_DROP });
    client.disconnect();

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(sockets).toHaveLength(1);
    expect(client.getState()).toBe('closed');
  });

  it('stops the ping interval when disconnect is called', async () => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: false },
      keepalive: { pingIntervalMs: 1000 },
    });
    await client.connect();
    openLatest();

    // one tick should send a ping
    jest.advanceTimersByTime(1000);
    const sendCallsBefore = latestSocket().send.mock.calls.length;
    expect(sendCallsBefore).toBeGreaterThan(0);

    client.disconnect();
    jest.advanceTimersByTime(10_000);
    expect(latestSocket().send.mock.calls.length).toBe(sendCallsBefore);
  });

  it('calls close(1000) on disconnect when the socket is open', async () => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();

    client.disconnect();
    expect(latestSocket().close).toHaveBeenCalledWith(WSCloseReason.NORMAL);
  });
});

describe('createWSClient — send + state', () => {
  it('no-ops send when the socket is not open', async () => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: false },
    });
    client.send({ type: 'ping' });
    expect(sockets).toHaveLength(0);
  });

  it('sends JSON-encoded payloads when open', async () => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: false },
    });
    await client.connect();
    openLatest();
    client.send({ type: 'ping' });
    expect(latestSocket().send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  });

  it('reports state transitions idle → connecting → open → closed', async () => {
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      reconnect: { enabled: false },
    });
    expect(client.getState()).toBe('idle');
    const connectPromise = client.connect();
    // connect awaits URL resolution — for a string URL it resolves synchronously
    await connectPromise;
    expect(client.getState()).toBe('connecting');
    openLatest();
    expect(client.getState()).toBe('open');
    latestSocket().onclose?.({ code: WSCloseReason.NORMAL });
    expect(client.getState()).toBe('closed');
  });
});

describe('createWSClient — URL provider errors', () => {
  it('invokes async URL providers for token freshness', async () => {
    const url = jest.fn().mockResolvedValue('ws://test/with-token?token=abc');
    const client = createWSClient<unknown>({
      url,
      onMessage: jest.fn(),
      reconnect: { enabled: false },
    });
    await client.connect();
    expect(url).toHaveBeenCalledTimes(1);
    expect(latestSocket().url).toBe('ws://test/with-token?token=abc');
  });

  it('surfaces provider errors via onError without instantiating a socket', async () => {
    const onError = jest.fn();
    const client = createWSClient<unknown>({
      url: () => Promise.reject(new Error('no token')),
      onMessage: jest.fn(),
      onError,
      reconnect: { enabled: false },
    });
    await client.connect();
    expect(sockets).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'no token' }));
    expect(client.getState()).toBe('closed');
  });

  it('surfaces constructor errors via onError', async () => {
    throwOnConstruct = true;
    const onError = jest.fn();
    const client = createWSClient<unknown>({
      url: 'ws://test/path',
      onMessage: jest.fn(),
      onError,
      reconnect: { enabled: false },
    });
    await client.connect();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'ctor boom' }));
  });
});
