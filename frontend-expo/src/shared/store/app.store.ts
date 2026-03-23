import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';
export type Locale = 'en';

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

type AppStore = AppState & AppActions;

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

    setTheme: (theme: Theme): void => {
      set((state) => {
        state.theme = theme;
      });
    },

    setLocale: (locale: Locale): void => {
      set((state) => {
        state.locale = locale;
      });
    },

    setOnline: (isOnline: boolean): void => {
      set((state) => {
        state.isOnline = isOnline;
      });
    },

    toggleTheme: (): void => {
      set((state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
      });
    },

    reset: (): void => {
      set(() => initialState);
    },
  })),
);
