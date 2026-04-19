import { renderHook, act } from '@testing-library/react-native';
import type { JobStatusEvent } from '@/features/migration/types/job-event.types';
import type { JobStreamHandlers } from '@/features/migration/services/job-stream.service';
import { createJobStream } from '@/features/migration/services/job-stream.service';
import { WSCloseReason } from '@/shared/services/websocket/ws.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

interface MockedClient {
  connect: jest.Mock;
  disconnect: jest.Mock;
  send: jest.Mock;
  getState: jest.Mock;
}

let lastHandlers: JobStreamHandlers | null = null;
let lastClient: MockedClient | null = null;

jest.mock('@/features/migration/services/job-stream.service', () => ({
  createJobStream: jest.fn(
    (_projectId: string, _tokenProvider: unknown, handlers: JobStreamHandlers) => {
      lastHandlers = handlers;
      const client: MockedClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        send: jest.fn(),
        getState: jest.fn(() => 'open'),
      };
      lastClient = client;
      return client;
    },
  ),
  defaultTokenProvider: jest.fn().mockResolvedValue('test-token'),
}));

// ─── SUT ───────────────────────────────────────────────────────────────────

import { useJobStream } from '../useJobStream';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<JobStatusEvent> = {}): JobStatusEvent {
  return {
    jobId: 'job-1',
    projectId: 'proj-1',
    companyId: null,
    jobType: 'mapping',
    status: 'running',
    sourceFileId: null,
    targetFileId: null,
    mappingFileId: null,
    accountTypeMappingFileId: null,
    triggeredBy: null,
    createdAt: null,
    startedAt: null,
    completedAt: null,
    eventAt: null,
    errorMessage: null,
    metadata: { sourceSystem: null, targetSystem: null },
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useJobStream', () => {
  beforeEach(() => {
    lastHandlers = null;
    lastClient = null;
    jest.clearAllMocks();
  });

  it('connects on mount with a non-empty projectId', () => {
    renderHook(() => useJobStream('proj-1'));
    expect(lastClient?.connect).toHaveBeenCalledTimes(1);
  });

  it('does not connect when projectId is empty', () => {
    renderHook(() => useJobStream(''));
    expect(lastClient).toBeNull();
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useJobStream('proj-1'));
    unmount();
    expect(lastClient?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('tracks the latest event in lastEvent', () => {
    const { result } = renderHook(() => useJobStream('proj-1'));
    expect(result.current.lastEvent).toBeNull();
    act(() => {
      lastHandlers?.onEvent(makeEvent({ status: 'running' }));
    });
    expect(result.current.lastEvent?.status).toBe('running');
  });

  it('fires onComplete when status === completed', () => {
    const onComplete = jest.fn();
    renderHook(() => useJobStream('proj-1', { onComplete }));
    const event = makeEvent({ status: 'completed' });
    act(() => {
      lastHandlers?.onEvent(event);
    });
    expect(onComplete).toHaveBeenCalledWith(event);
  });

  it('fires onFailed when status === failed', () => {
    const onFailed = jest.fn();
    renderHook(() => useJobStream('proj-1', { onFailed }));
    const event = makeEvent({ status: 'failed', errorMessage: 'boom' });
    act(() => {
      lastHandlers?.onEvent(event);
    });
    expect(onFailed).toHaveBeenCalledWith(event);
  });

  it('does not fire onComplete for non-completed events', () => {
    const onComplete = jest.fn();
    renderHook(() => useJobStream('proj-1', { onComplete }));
    act(() => {
      lastHandlers?.onEvent(makeEvent({ status: 'running' }));
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('surfaces a terminal error on 4401 close', () => {
    const { result } = renderHook(() => useJobStream('proj-1'));
    act(() => {
      lastHandlers?.onClose?.(WSCloseReason.UNAUTHORIZED);
    });
    expect(result.current.error?.code).toBe('WS_UNAUTHORIZED');
  });

  it('surfaces a terminal error on 4403 close', () => {
    const { result } = renderHook(() => useJobStream('proj-1'));
    act(() => {
      lastHandlers?.onClose?.(WSCloseReason.FORBIDDEN);
    });
    expect(result.current.error?.code).toBe('WS_FORBIDDEN');
  });

  it('does not surface a terminal error on 1000 or 1006', () => {
    const { result } = renderHook(() => useJobStream('proj-1'));
    act(() => {
      lastHandlers?.onClose?.(WSCloseReason.NETWORK_DROP);
    });
    expect(result.current.error).toBeNull();
    act(() => {
      lastHandlers?.onClose?.(WSCloseReason.NORMAL);
    });
    expect(result.current.error).toBeNull();
  });

  it('updates status when the socket opens', () => {
    const { result } = renderHook(() => useJobStream('proj-1'));
    act(() => {
      lastHandlers?.onOpen?.();
    });
    expect(result.current.status).toBe('open');
  });

  it('reconnect() disconnects and reconnects', () => {
    const createJobStreamMock = createJobStream as jest.MockedFunction<
      typeof createJobStream
    >;
    const { result } = renderHook(() => useJobStream('proj-1'));
    const initialCreateCalls = createJobStreamMock.mock.calls.length;
    const initialClient = lastClient;
    const initialDisconnect = initialClient?.disconnect;
    act(() => {
      result.current.reconnect();
    });
    expect(initialDisconnect).toHaveBeenCalledTimes(1);
    // A fresh client must have been built and connected, otherwise
    // `reconnect()` didn't actually reconnect.
    expect(createJobStreamMock.mock.calls.length).toBeGreaterThan(
      initialCreateCalls,
    );
    expect(lastClient).not.toBe(initialClient);
    expect(lastClient?.connect).toHaveBeenCalledTimes(1);
  });
});
