import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { type OrgId, createOrgId } from '@/shared/types/common.types';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import { storageService } from '@/shared/services/storage/storage.service';

// ─── Types ──────────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark';

type Locale = 'en';

interface AppState {
  theme: Theme;
  locale: Locale;
  isOnline: boolean;
  isDrawerCollapsed: boolean;
  activeOrgId: OrgId | null;
}

interface AppActions {
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setOnline: (isOnline: boolean) => void;
  setDrawerCollapsed: (collapsed: boolean) => void;
  toggleDrawerCollapsed: () => void;
  toggleTheme: () => void;
  setActiveOrg: (orgId: OrgId | null) => void;
  hydrateActiveOrg: () => Promise<void>;
  reset: () => void;
}

interface AppStore extends AppState, AppActions {}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState: AppState = {
  theme: 'light',
  locale: 'en',
  isOnline: true,
  isDrawerCollapsed: false,
  activeOrgId: null,
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

    setActiveOrg: (orgId: OrgId | null) => {
      set((state) => {
        state.activeOrgId = orgId;
      });
      if (orgId !== null) {
        storageService.set(STORAGE_KEYS.ACTIVE_ORG_ID, orgId).catch(() => {});
      } else {
        storageService.remove(STORAGE_KEYS.ACTIVE_ORG_ID).catch(() => {});
      }
    },

    hydrateActiveOrg: async (): Promise<void> => {
      try {
        const raw = await storageService.get(STORAGE_KEYS.ACTIVE_ORG_ID);
        set((state) => {
          state.activeOrgId = raw ? createOrgId(raw) : null;
        });
      } catch {
        // Storage read failed — keep activeOrgId as null (safe default)
      }
    },

    reset: () => {
      set(() => initialState);
      storageService.remove(STORAGE_KEYS.ACTIVE_ORG_ID).catch(() => {});
    },
  })),
);

// ─── Types (re-exported for selectors) ──────────────────────────────────────

export type { Theme, Locale, AppState, AppActions };
