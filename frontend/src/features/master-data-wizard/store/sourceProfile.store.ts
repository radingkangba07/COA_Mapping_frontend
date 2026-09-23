import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/pagination';
import type { DrawerTabId } from '../utils/taxonomy';
import type { SortKey } from '../utils/fields';

export type { SortKey };
export type SortDirection = 'asc' | 'desc';

export type ApprovalKind = 'confirm' | 'ignore';

/** One applied, undo-able migration-config decision. `label` is the final
 *  display copy (e.g. "Ignored SKU"), computed by the caller from the live
 *  field record — the store only ever stores the result, never derives it,
 *  so it stays a thin state container. */
export interface Decision {
  readonly id: string;
  readonly kind: ApprovalKind;
  readonly fieldId: string;
  readonly label: string;
}

export interface PendingApproval {
  readonly kind: ApprovalKind;
  readonly fieldId: string;
}

interface SourceProfileState {
  readonly categoryFilter: string;
  // The KPI strip's own filter, entirely separate from categoryFilter —
  // mirrors the reference's `metric`/`filterIds` state, which highlights
  // matching rows and dims the rest without touching the field-filter
  // dropdown's own selection.
  readonly metricFilterId: string | null;
  // The Copilot's own highlight source — a suggested prompt sets these
  // directly (raw field ids, not a metric lookup), mirroring the
  // reference's shared `highlightIds`/`filterIds` state that both
  // `clickMetric` and `runPrompt` write to. `promptHighlightIds` always
  // glows its rows; `promptFilterIds` additionally dims every non-matching
  // row, and is only ever non-empty for the one prompt (idprob) whose
  // reference action sets `filterIds` too — every other prompt highlights
  // rows without dimming the rest. `promptFilterLabel` is non-null only for
  // that same prompt, whose action also pushes a "Visual filters" chip.
  readonly promptHighlightIds: readonly string[];
  readonly promptFilterIds: readonly string[];
  readonly promptFilterLabel: string | null;
  readonly sortKey: SortKey;
  readonly sortDirection: SortDirection;
  readonly page: number;
  /** User-selectable rows-per-page, seeded from the app-wide
   *  `DEFAULT_PAGE_SIZE` — takes precedence over the taxonomy-sourced
   *  `PAGE_SIZE` constant once the user has picked one. */
  readonly pageSize: number;
  // Selection is capped at 2, enforced here so CompareSelectionBar/
  // FieldComparisonModal never need to guard against a 3rd selection.
  readonly selectedIds: readonly string[];
  readonly openFieldId: string | null;
  // Only set when something (e.g. the Copilot) opens a field on a specific
  // tab — the drawer falls back to Overview when this is null. Cleared on
  // close so a later plain `openField` doesn't inherit a stale tab.
  readonly openFieldTab: DrawerTabId | null;
  readonly compareOpen: boolean;
  // Client-side only — no persistence, no fetch, no invented write endpoint.
  // "Keep decisions in the feature's zustand store and raise the endpoint
  // question; do not invent a route" (see CLAUDE.md's approval-gate rule).
  readonly decisions: readonly Decision[];
  readonly pendingApproval: PendingApproval | null;
}

interface SourceProfileActions {
  setCategoryFilter: (categoryId: string) => void;
  toggleMetricFilter: (metricId: string) => void;
  clearMetricFilter: () => void;
  setPromptHighlight: (
    highlightIds: readonly string[],
    filterIds: readonly string[],
    filterLabel: string | null,
  ) => void;
  setSort: (key: SortKey) => void;
  setPage: (page: number) => void;
  /** Also resets `page` to 0 — same convention as `setCategoryFilter`/`setSort`. */
  setPageSize: (size: number) => void;
  toggleSelected: (fieldId: string) => void;
  clearSelected: () => void;
  openField: (fieldId: string, tab?: DrawerTabId) => void;
  closeField: () => void;
  openCompare: () => void;
  closeCompare: () => void;
  openApproval: (pending: PendingApproval) => void;
  closeApproval: () => void;
  applyApproval: (label: string) => void;
  undoDecision: (decisionId: string) => void;
  reset: () => void;
}

type SourceProfileStore = SourceProfileState & SourceProfileActions;

const MAX_SELECTED = 2;

// Monotonic id sequence for Decision.id — module-level since it only needs
// to be unique within a live session, not across reloads (decisions carry
// no persistence, see the SourceProfileState.decisions comment below).
let decSeq = 0;

const initialState: SourceProfileState = {
  categoryFilter: 'all',
  metricFilterId: null,
  promptHighlightIds: [],
  promptFilterIds: [],
  promptFilterLabel: null,
  sortKey: null,
  sortDirection: 'asc',
  page: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  selectedIds: [],
  openFieldId: null,
  openFieldTab: null,
  compareOpen: false,
  decisions: [],
  pendingApproval: null,
};

export const useSourceProfileStore = create<SourceProfileStore>()(
  immer((set) => ({
    ...initialState,

    setCategoryFilter: (categoryId: string) => {
      set((state) => {
        state.categoryFilter = state.categoryFilter === categoryId ? 'all' : categoryId;
        state.page = 0;
      });
    },

    toggleMetricFilter: (metricId: string) => {
      set((state) => {
        state.metricFilterId = state.metricFilterId === metricId ? null : metricId;
        // A fresh KPI-tile click overwrites whichever highlight source was
        // previously active, matching the reference's own each-action-
        // overwrites-everything semantics.
        state.promptHighlightIds = [];
        state.promptFilterIds = [];
        state.promptFilterLabel = null;
      });
    },

    clearMetricFilter: () => {
      set((state) => {
        state.metricFilterId = null;
        state.promptHighlightIds = [];
        state.promptFilterIds = [];
        state.promptFilterLabel = null;
      });
    },

    setPromptHighlight: (
      highlightIds: readonly string[],
      filterIds: readonly string[],
      filterLabel: string | null,
    ) => {
      set((state) => {
        state.promptHighlightIds = [...highlightIds];
        state.promptFilterIds = [...filterIds];
        state.promptFilterLabel = filterLabel;
        state.metricFilterId = null;
      });
    },

    setSort: (key: SortKey) => {
      set((state) => {
        if (state.sortKey === key) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDirection = 'asc';
        }
        state.page = 0;
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

    toggleSelected: (fieldId: string) => {
      set((state) => {
        const index = state.selectedIds.indexOf(fieldId);
        if (index >= 0) {
          state.selectedIds.splice(index, 1);
        } else if (state.selectedIds.length >= MAX_SELECTED) {
          // Reference's own `toggleSelect`: `if (s.selectedIds.length >= 2)
          // return { selectedIds: [s.selectedIds[1], id] }` — a rolling
          // window that evicts the OLDEST pick and keeps going, rather
          // than blocking a 3rd selection outright.
          state.selectedIds = [...state.selectedIds.slice(1), fieldId];
        } else {
          state.selectedIds.push(fieldId);
        }
      });
    },

    clearSelected: () => {
      set((state) => {
        state.selectedIds = [];
      });
    },

    openField: (fieldId: string, tab?: DrawerTabId) => {
      set((state) => {
        state.openFieldId = fieldId;
        state.openFieldTab = tab ?? null;
      });
    },

    closeField: () => {
      set((state) => {
        state.openFieldId = null;
        state.openFieldTab = null;
      });
    },

    openCompare: () => {
      set((state) => {
        state.compareOpen = true;
      });
    },

    closeCompare: () => {
      set((state) => {
        state.compareOpen = false;
      });
    },

    openApproval: (pending: PendingApproval) => {
      set((state) => {
        state.pendingApproval = pending;
      });
    },

    closeApproval: () => {
      set((state) => {
        state.pendingApproval = null;
      });
    },

    applyApproval: (label: string) => {
      set((state) => {
        const pending = state.pendingApproval;
        if (!pending) return;
        decSeq += 1;
        state.decisions.push({ id: `d${decSeq}`, kind: pending.kind, fieldId: pending.fieldId, label });
        state.pendingApproval = null;
      });
    },

    // The one and only revert path — a row's "Restore field" menu item and
    // a future decisions-log "Undo" chip both call this, so the decisions
    // log and a field's effective confirmed/ignored state can never desync
    // (the reference prototype has exactly this bug: its menu-driven
    // restore skips the decisions array entirely).
    undoDecision: (decisionId: string) => {
      set((state) => {
        const index = state.decisions.findIndex((d) => d.id === decisionId);
        if (index >= 0) state.decisions.splice(index, 1);
      });
    },

    reset: () => {
      set(() => initialState);
    },
  })),
);
