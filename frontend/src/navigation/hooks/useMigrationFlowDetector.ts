import { useEffect, useRef } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { useAppStore } from '@/shared/store/app.store';

const MIGRATION_FLOW_SCREENS = [
  'ERPSelect',
  'Upload',
  'Mapping',
  'Validation',
  'FinalPreview',
  'Preview',
] as const;

export function useMigrationFlowDetector(): void {
  const routeName = useNavigationState(
    (state) => state.routes[state.index]?.name,
  );
  const setDrawerCollapsed = useAppStore((s) => s.setDrawerCollapsed);
  const prevRouteRef = useRef<string | null>(null);

  useEffect(() => {
    if (routeName === prevRouteRef.current) return;
    prevRouteRef.current = routeName ?? null;

    if (MIGRATION_FLOW_SCREENS.includes(routeName as (typeof MIGRATION_FLOW_SCREENS)[number])) {
      setDrawerCollapsed(true);
    } else if (routeName === 'MigrationList') {
      setDrawerCollapsed(false);
    }
  }, [routeName, setDrawerCollapsed]);

  useEffect(() => {
    return () => setDrawerCollapsed(false);
  }, [setDrawerCollapsed]);
}
