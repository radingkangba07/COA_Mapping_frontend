import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/pagination';
import type { MappingSortDirection, MappingSortKey } from '../utils/mappingRows';

export type { MappingSortKey, MappingSortDirection };

/**
 * Mapping screen's own UI state — separate from `sourceProfile.store.ts`
 * (Profile's confirm/ignore model, not reused here) and from
 * `wizard.store.ts` (cross-cutting accept/override decisions). Mirrors
 * `sourceProfile.store.ts`'s own shape: one store per feature screen
 * holding filter *and* sort *and* page *and* row-selection together,
 * rather than splitting these across multiple stores.
 */
interface MappingScreenState {
  /** Id of the active KPI card (`MappingCard.id`), or null when none is
   *  selected — mirrors `sourceProfile.store.ts`'s `metricFilterId`. */
  readonly cardFilter: string | null;
  readonly sortKey: MappingSortKey;
  readonly sortDir: MappingSortDirection;
  /** 0-indexed, matching `sourceProfile.store.ts`'s own `page`. */
  readonly page: number;
  /** User-selectable rows-per-page, seeded from the app-wide
   *  `DEFAULT_PAGE_SIZE` — takes precedence over `mappingPageSize()`'s
   *  data-driven fallback once the user has picked one. */
  readonly pageSize: number;
  /** Row id -> selected, mirrors the reference's own `selected: {}` map
   *  (DA-373's checkbox column; the bulk-action toolbar consuming this
   *  is DA-384, not built yet). */
  readonly selected: Readonly<Record<string, boolean>>;
  /** DA-374's inline retarget editor — id of the row whose picker is
   *  open, or null. Mirrors the reference's own `editId`. */
  readonly editingRowId: string | null;
  /** Scratch value for the open picker — reference's own `editTarget`.
   *  Empty string means "Not mapped" selected, matching `Select`'s own
   *  string-only value contract. */
  readonly draftTargetId: string;
  /** DA-377's detail drawer — id of the open row, or null. Mirrors
   *  `sourceProfile.store.ts`'s own `openFieldId` (no `openFieldTab` here:
   *  this drawer has no tabs yet). */
  readonly openFieldId: string | null;
}

interface MappingScreenActions {
  /** Toggles a card on/off — clicking the already-active card clears it,
   *  matching `sourceProfile.store.ts`'s `toggleMetricFilter` exactly.
   *  Also resets `page` to 0 — reference: `setCardFilter = (id) =>
   *  this.setState((s) => ({ cardFilter: ..., page: 0 }))`. */
  setCardFilter: (cardId: string) => void;
  /** Absolute set for the DA-369 filter dropdown — reference: `pickMapFilter
   *  = (id) => this.setState({ cardFilter: id, page: 0, ... })`, deliberately
   *  not a toggle. Picking "All fields" again is a no-op, not a re-clear;
   *  only `setCardFilter`'s card-click path treats re-selection as clearing. */
  pickCardFilter: (cardId: string | null) => void;
  /** Also resets `page` to 0 — reference: `clearCardFilter = () =>
   *  this.setState({ cardFilter: null, page: 0 })`. */
  clearCardFilter: () => void;
  /** 3-way cycle per column — reference: `toggleSort = (key) =>
   *  s.sortKey === key ? (asc ? desc : {sortKey:null, sortDir:'asc'}) :
   *  {sortKey:key, sortDir:'asc', page:0}` — switching to a *different*
   *  column resets to asc and resets page; re-clicking the same column
   *  cycles asc -> desc -> unsorted without touching page. */
  toggleSort: (key: NonNullable<MappingSortKey>) => void;
  setPage: (page: number) => void;
  /** Also resets `page` to 0 — same convention as `setCardFilter`/`toggleSort`. */
  setPageSize: (size: number) => void;
  toggleRowSelect: (id: string) => void;
  /** Reference's own `toggleSelectAllOn` — only affects the ids passed in
   *  (the current page's rows), not the whole filtered set. */
  toggleSelectAllOn: (ids: readonly string[]) => void;
  clearSelection: () => void;
  /** Opens the picker for one row, seeded with its current target — reference:
   *  `startEditTarget = (id) => this.setState({ editId: id, editTarget:
   *  this.currentTargetId(id) })`. */
  startEditTarget: (rowId: string, currentTargetId: string) => void;
  setDraftTarget: (targetId: string) => void;
  cancelEditTarget: () => void;
  /** Opens the detail drawer for one row — reference's own `openPanel`. */
  openField: (fieldId: string) => void;
  /** Reference's own `closePanel`. */
  closeField: () => void;
  reset: () => void;
}

type MappingScreenStore = MappingScreenState & MappingScreenActions;

const initialState: MappingScreenState = {
  cardFilter: null,
  sortKey: null,
  sortDir: 'asc',
  page: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  selected: {},
  editingRowId: null,
  draftTargetId: '',
  openFieldId: null,
};

export const useMappingScreenStore = create<MappingScreenStore>()(
  immer((set) => ({
    ...initialState,

    setCardFilter: (cardId: string) => {
      set((state) => {
        state.cardFilter = state.cardFilter === cardId ? null : cardId;
        state.page = 0;
      });
    },

    pickCardFilter: (cardId: string | null) => {
      set((state) => {
        state.cardFilter = cardId;
        state.page = 0;
      });
    },

    clearCardFilter: () => {
      set((state) => {
        state.cardFilter = null;
        state.page = 0;
      });
    },

    toggleSort: (key: NonNullable<MappingSortKey>) => {
      set((state) => {
        if (state.sortKey === key) {
          if (state.sortDir === 'asc') {
            state.sortDir = 'desc';
          } else {
            state.sortKey = null;
            state.sortDir = 'asc';
          }
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
          state.page = 0;
        }
      });
    },

    setPage: (page: number) => {
      set((state) => {
        state.page = page;
      });
    },

    setPageSize: (size: number) => {
      set((state) => {
        state.pageSize = size;
        state.page = 0;
      });
    },

    toggleRowSelect: (id: string) => {
      set((state) => {
        if (state.selected[id]) {
          delete state.selected[id];
        } else {
          state.selected[id] = true;
        }
      });
    },

    toggleSelectAllOn: (ids: readonly string[]) => {
      set((state) => {
        const allOn = ids.length > 0 && ids.every((id) => state.selected[id]);
        ids.forEach((id) => {
          if (allOn) {
            delete state.selected[id];
          } else {
            state.selected[id] = true;
          }
        });
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selected = {};
      });
    },

    startEditTarget: (rowId: string, currentTargetId: string) => {
      set((state) => {
        state.editingRowId = rowId;
        state.draftTargetId = currentTargetId;
      });
    },

    setDraftTarget: (targetId: string) => {
      set((state) => {
        state.draftTargetId = targetId;
      });
    },

    cancelEditTarget: () => {
      set((state) => {
        state.editingRowId = null;
        state.draftTargetId = '';
      });
    },

    openField: (fieldId: string) => {
      set((state) => {
        state.openFieldId = fieldId;
      });
    },

    closeField: () => {
      set((state) => {
        state.openFieldId = null;
      });
    },

    reset: () => {
      set(() => initialState);
    },
  })),
);
