import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { httpClient } from '@/shared/services/http/http.instance';
import { startOAuth2Flow } from '../services/erp-connection.service';
import { env } from '@/config/env';

export type OAuth2Status = 'idle' | 'connecting' | 'connected' | 'error';

export interface OAuth2FlowResult {
  readonly status: OAuth2Status;
  readonly error: string | null;
  readonly connect: (clientId: string, clientSecret: string, baseUrl: string) => Promise<void>;
  readonly reset: () => void;
}

export function useOAuth2Flow(onTokenReceived: (token: string) => void): OAuth2FlowResult {
  const [status, setStatus] = useState<OAuth2Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const reset = useCallback((): void => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
      listenerRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  const connect = useCallback(
    async (clientId: string, clientSecret: string, baseUrl: string): Promise<void> => {
      if (Platform.OS !== 'web') {
        setError('OAuth authorisation requires the web browser.');
        setStatus('error');
        return;
      }

      setStatus('connecting');
      setError(null);

      const result = await startOAuth2Flow(httpClient, clientId, clientSecret, baseUrl);
      if (!result.ok) {
        setError(result.error.message);
        setStatus('error');
        return;
      }

      const popup = window.open(
        result.data.auth_url,
        'netsuite-oauth',
        'width=620,height=720,scrollbars=yes,resizable=yes',
      );

      if (!popup) {
        setError('Popup blocked — allow popups for this site and try again.');
        setStatus('error');
        return;
      }

      // Clean up any prior listener before adding a new one.
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
      }

      const handler = (event: MessageEvent): void => {
        // Only accept messages from our backend callback page.
        // Extract the origin component so path suffixes in API_BASE_URL do not
        // break the comparison. window.location.origin is intentionally not used
        // as a fallback — it is the frontend origin, not the backend origin.
        const expectedOrigin = new URL(env.API_BASE_URL).origin;
        if (event.origin !== expectedOrigin) return;

        window.removeEventListener('message', handler);
        listenerRef.current = null;

        const data = event.data as Record<string, unknown>;
        if (typeof data?.access_token === 'string' && data.access_token) {
          onTokenReceived(data.access_token);
          setStatus('connected');
        } else {
          const msg = typeof data?.error === 'string' ? data.error : 'authorisation_failed';
          setError(msg);
          setStatus('error');
        }
      };

      listenerRef.current = handler;
      window.addEventListener('message', handler);
    },
    [onTokenReceived],
  );

  return { status, error, connect, reset };
}
