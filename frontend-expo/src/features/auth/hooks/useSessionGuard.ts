import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { selectAuthRestoring } from '../store/auth.selectors';

// ─── Return Type ────────────────────────────────────────────────────────────

interface SessionGuardResult {
  readonly isRestoring: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSessionGuard(): SessionGuardResult {
  const isRestoring = useAuthStore(selectAuthRestoring);

  useEffect(() => {
    void useAuthStore.getState().restoreSession();
  }, []);

  return { isRestoring };
}
