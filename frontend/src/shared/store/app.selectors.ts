import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type Theme, type Locale, type AppActions } from './app.store';

export const useTheme = (): Theme => useAppStore((s) => s.theme);

export const useLocale = (): Locale => useAppStore((s) => s.locale);

export const useIsOnline = (): boolean => useAppStore((s) => s.isOnline);

export const useAppActions = (): AppActions =>
  useAppStore(
    useShallow((s) => ({
      setTheme: s.setTheme,
      setLocale: s.setLocale,
      setOnline: s.setOnline,
      setDrawerCollapsed: s.setDrawerCollapsed,
      toggleDrawerCollapsed: s.toggleDrawerCollapsed,
      toggleTheme: s.toggleTheme,
      reset: s.reset,
    })),
  );
