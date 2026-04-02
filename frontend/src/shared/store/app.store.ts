import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── Types ──────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';

type Locale = 'en';

interface AppState {
  theme: Theme;
  locale: Locale;
  isOnline: boolean;
  isDrawerCollapsed: boolean;
}

interface AppActions {
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setOnline: (isOnline: boolean) => void;
  setDrawerCollapsed: (collapsed: boolean) => void;
  toggleDrawerCollapsed: () => void;
  toggleTheme: () => void;
  reset: () => void;
}

interface AppStore extends AppState, AppActions {}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AppState = {
  theme: 'light',
  locale: 'en',
  isOnline: true,
  isDrawerCollapsed: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  immer((set) => ({
    ...initialState,

    setTheme: (theme: Theme) => {
      set((state) => {
        state.theme = theme;
      });
    },

    setLocale: (locale: Locale) => {
      set((state) => {
        state.locale = locale;
      });
    },

    setOnline: (isOnline: boolean) => {
      set((state) => {
        state.isOnline = isOnline;
      });
    },

    setDrawerCollapsed: (collapsed: boolean) => {
      set((state) => {
        state.isDrawerCollapsed = collapsed;
      });
    },

    toggleDrawerCollapsed: () => {
      set((state) => {
        state.isDrawerCollapsed = !state.isDrawerCollapsed;
      });
    },

    toggleTheme: () => {
      set((state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
      });
    },

    reset: () => {
      set(() => initialState);
    },
  })),
);

// ─── Types (re-exported for selectors) ──────────────────────────────────────

export type { Theme, Locale, AppState, AppActions };
