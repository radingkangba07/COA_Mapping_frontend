import { useAppStore } from './app.store';
import type { Theme, Locale } from './app.store';

export const selectTheme = (state: ReturnType<typeof useAppStore.getState>): Theme =>
  state.theme;

export const selectLocale = (state: ReturnType<typeof useAppStore.getState>): Locale =>
  state.locale;

export const selectIsOnline = (state: ReturnType<typeof useAppStore.getState>): boolean =>
  state.isOnline;
