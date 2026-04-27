import { useCallback, useEffect, useRef, useState } from 'react';
import type { WSClient, WSClientState, WSCloseReason } from '@/shared/services/websocket/ws.types';
import { WSCloseReason as WSCloseReasonValues } from '@/shared/services/websocket/ws.types';
import type { AppError } from '@/shared/types/result.types';
import type { JobStatusEvent } from '@/features/migration/types/job-event.types';
import {
  createJobStream,
  defaultTokenProvider,
} from '@/features/migration/services/job-stream.service';

export interface UseJobStreamOptions {
  readonly onComplete?: (event: JobStatusEvent) => void;
  readonly onFailed?: (event: JobStatusEvent) => void;
}

export interface UseJobStreamReturn {
  readonly status: WSClientState;
  readonly lastEvent: JobStatusEvent | null;
  readonly error: AppError | null;
  readonly reconnect: () => void;
}

/**
 * Subscribe to the project's job-status WebSocket stream. Connects on mount
 * for any non-empty `projectId`, reconnects on transient network drops (1006)
 * only, and surfaces a terminal error for auth/permission close codes.
 */
export function useJobStream(
  projectId: string,
  options?: UseJobStreamOptions,
): UseJobStreamReturn {
  const [status, setStatus] = useState<WSClientState>('idle');
  const [lastEvent, setLastEvent] = useState<JobStatusEvent | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const clientRef = useRef<WSClient | null>(null);
  const optionsRef = useRef<UseJobStreamOptions | undefined>(options);
  optionsRef.current = options;

  const connect = useCallback((): void => {
    if (projectId.length === 0) return;

    setError(null);
    setStatus('connecting');

    const client = createJobStream(projectId, defaultTokenProvider, {
      onOpen: (): void => setStatus('open'),
      onEvent: (event): void => {
        setLastEvent(event);
        if (event.status === 'completed') {
          optionsRef.current?.onComplete?.(event);
        } else if (event.status === 'failed') {
          optionsRef.current?.onFailed?.(event);
        }
      },
      onError: (appError): void => setError(appError),
      onClose: (reason: WSCloseReason | number): void => {
        setStatus('closed');
        if (
          reason === WSCloseReasonValues.UNAUTHORIZED ||
          reason === WSCloseReasonValues.FORBIDDEN
        ) {
          setError({
            code: reason === WSCloseReasonValues.UNAUTHORIZED
              ? 'WS_UNAUTHORIZED'
              : 'WS_FORBIDDEN',
            message:
              reason === WSCloseReasonValues.UNAUTHORIZED
                ? 'Your session has expired. Please sign in again.'
                : 'You do not have access to this project.',
          });
        }
      },
    });

    clientRef.current = client;
    void client.connect();
  }, [projectId]);

  useEffect(() => {
    if (projectId.length === 0) {
      return;
    }
    connect();
    return (): void => {
      // Do not call setStatus here — the component is unmounting, and React
      // warns in strict mode when state is set during unmount. Consumers
      // won't read it once the hook is gone.
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [projectId, connect]);

  const reconnect = useCallback((): void => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    connect();
  }, [connect]);

  return { status, lastEvent, error, reconnect };
}
