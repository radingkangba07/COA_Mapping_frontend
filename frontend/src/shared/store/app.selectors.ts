import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type Theme, type Locale, type AppState, type AppActions } from './app.store';

export const useTheme = (): Theme => useAppStore((s) => s.theme);

export const useLocale = (): Locale => useAppStore((s) => s.locale);

export const useIsOnline = (): boolean => useAppStore((s) => s.isOnline);

export const selectActiveOrgId = (s: AppState): AppState['activeOrgId'] => s.activeOrgId;

export const useActiveOrgId = (): AppState['activeOrgId'] =>
  useAppStore((s) => s.activeOrgId);

export const useAppActions = (): AppActions =>
  useAppStore(
    useShallow((s) => ({
      setTheme: s.setTheme,
      setLocale: s.setLocale,
      setOnline: s.setOnline,
      setDrawerCollapsed: s.setDrawerCollapsed,
      toggleDrawerCollapsed: s.toggleDrawerCollapsed,
      toggleTheme: s.toggleTheme,
      setActiveOrg: s.setActiveOrg,
      hydrateActiveOrg: s.hydrateActiveOrg,
      reset: s.reset,
    })),
  );
