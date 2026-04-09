import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { selectAuthRestoring } from '../store/auth.selectors';
import { useAppStore } from '@/shared/store/app.store';

// ─── Return Type ────────────────────────────────────────────────────────────

interface SessionGuardResult {
  readonly isRestoring: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSessionGuard(): SessionGuardResult {
  const isRestoring = useAuthStore(selectAuthRestoring);

  useEffect(() => {
    void useAuthStore.getState().restoreSession().then(() => {
      // Only hydrate active org if a valid session was restored
      if (useAuthStore.getState().user) {
        void useAppStore.getState().hydrateActiveOrg();
      }
    });
  }, []);

  return { isRestoring };
}
