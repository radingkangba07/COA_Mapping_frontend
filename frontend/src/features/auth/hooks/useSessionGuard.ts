import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { selectAuthRestoring } from '../store/auth.selectors';
import { useAppStore } from '@/shared/store/app.store';

// ─── Return Type ────────────────────────────────────────────────────────────

interface SessionGuardResult {
  readonly isRestoring: boolean;
}

// ─── Callback URL Detection ─────────────────────────────────────────────────

function detectCallbackTokens(): { accessToken: string; refreshToken: string } | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  if (!window.location.pathname.endsWith('/auth/callback')) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

function cleanCallbackUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  // Strip /auth/callback and query string, keep the deployment base path
  const clean = window.location.pathname.replace(/\/auth\/callback$/, '/');
  window.history.replaceState(null, '', clean);
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSessionGuard(): SessionGuardResult {
  const isRestoring = useAuthStore(selectAuthRestoring);

  useEffect(() => {
    const callbackTokens = detectCallbackTokens();

    if (callbackTokens) {
      // Magic-link callback: handle tokens directly from the URL.
      // This bypasses React Navigation linking entirely — no dependency on
      // <base href>, prefixes, or getStateFromPath. The spinner stays
      // visible (isRestoring = true) until handleAuthCallback completes.
      void (async (): Promise<void> => {
        await useAuthStore.getState().handleAuthCallback(callbackTokens);

        cleanCallbackUrl();

        // isRestoring is still true here (restoreSession was never called).
        // Flip it so AppContent renders the navigator.
        useAuthStore.setState({ isRestoring: false });

        if (useAuthStore.getState().user) {
          void useAppStore.getState().hydrateActiveOrg();
        }
      })();
    } else {
      // Normal boot: restore session from persisted tokens in storage.
      void useAuthStore.getState().restoreSession().then(() => {
        if (useAuthStore.getState().user) {
          void useAppStore.getState().hydrateActiveOrg();
        }
      });
    }
  }, []);

  return { isRestoring };
}
