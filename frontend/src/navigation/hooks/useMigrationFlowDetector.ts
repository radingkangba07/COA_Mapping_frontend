import { useEffect } from 'react';
import { useAppStore } from '@/shared/store/app.store';

/**
 * Collapses the drawer on mount and expands it on unmount.
 * Call this from any component that should trigger drawer collapse
 * (e.g., MigrationLayout which wraps all migration flow screens).
 */
export function useMigrationFlowDetector(): void {
  const setDrawerCollapsed = useAppStore((s) => s.setDrawerCollapsed);

  useEffect(() => {
    setDrawerCollapsed(true);
    return () => setDrawerCollapsed(false);
  }, [setDrawerCollapsed]);
}
