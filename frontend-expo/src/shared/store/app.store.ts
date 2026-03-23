import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── Types ──────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';

type Locale = 'en';

interface AppState {
  theme: Theme;
  locale: Locale;
  isOnline: boolean;
}

interface AppActions {
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setOnline: (isOnline: boolean) => void;
  toggleTheme: () => void;
  reset: () => void;
}

interface AppStore extends AppState, AppActions {}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AppState = {
  theme: 'light',
  locale: 'en',
  isOnline: true,
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
