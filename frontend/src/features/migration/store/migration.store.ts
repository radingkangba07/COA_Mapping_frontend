import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import { storageService } from '@/shared/services/storage/storage.service';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type {
  UploadedFile,
  TypeMappingRow,
} from '@/features/migration/types/migration.types';
import type {
  GroupedMapping,
  ConfidenceLevel,
  AccountMapping,
} from '@/features/migration/types/mapping.types';
import type { AppError } from '@/shared/types/result.types';
import { createFileId } from '@/shared/types/common.types';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';
import { selectionKey } from '@/features/migration/utils/selection.utils';
import { confirmBand } from '@/features/migration/services/mapping.service';
import { httpClient } from '@/shared/services/http/http.instance';

// ─── State ──────────────────────────────────────────────────────────────────

interface MigrationState {
  currentStep: number;
  completedSteps: number[];

  sourceERP: ERPSystem | null;
  targetERP: ERPSystem | null;

  sourceFile: UploadedFile | null;
  targetFile: UploadedFile | null;
  mappingFile: UploadedFile | null;
  sourceData: Record<string, unknown>[];
  targetData: Record<string, unknown>[];
  mappingData: Record<string, unknown>[];

  typeMappingRows: TypeMappingRow[];
  hasUnsavedChanges: boolean;
  hasUnsavedTypeMappings: boolean;
  targetTypes: string[];

  groupedMappings: GroupedMapping[];
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  // Keys of accounts whose status has been set to 'confirmed'. Persisted so
  // that confirmed status survives a page refresh and can be re-applied after
  // groupedMappings is re-fetched from the server.
  confirmedAccountKeys: Record<string, true>;
  confidenceFilter: ConfidenceLevel | null;
  selection: Record<string, true>;

  pendingSourceRemoval: boolean;
  pendingTargetRemoval: boolean;
  pendingMappingRemoval: boolean;

  projectId: string | null;
  workstreamId: string | null;
  jobId: string | null;
  isLoading: boolean;
  error: AppError | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

interface MigrationActions {
  setStep: (step: number) => void;
  completeStep: (step: number) => void;

  setSourceERP: (erp: ERPSystem) => void;
  setTargetERP: (erp: ERPSystem) => void;

  setSourceData: (file: UploadedFile, data: Record<string, unknown>[]) => void;
  setTargetData: (file: UploadedFile, data: Record<string, unknown>[]) => void;
  setMappingData: (file: UploadedFile, data: Record<string, unknown>[]) => void;
  setCoa: (
    source: Record<string, unknown>[],
    target: Record<string, unknown>[],
  ) => void;

  setTypeMappingRows: (rows: TypeMappingRow[]) => void;
  hydrateTypeMappingRows: (rows: TypeMappingRow[]) => void;
  updateTypeMappingRow: (
    id: string,
    update: Partial<Pick<TypeMappingRow, 'sourceType' | 'targetTypes'>>,
  ) => void;
  addTypeMappingRow: () => void;
  deleteTypeMappingRow: (id: string) => void;
  markChangesSaved: () => void;
  markTypeMappingsSaved: () => void;

  setConfidenceFilter: (filter: ConfidenceLevel | null) => void;
  setGroupedMappings: (mappings: GroupedMapping[]) => void;
  updateTypeMapping: (sourceType: string, targetType: string) => void;
  updateAccountName: (
    sourceType: string,
    accountIdx: number,
    newName: string,
    userName: string,
    sourceName?: string,
    suggestionId?: string,
    targetNumber?: string | null,
  ) => void;
  confirmConfidenceLevel: (level: ConfidenceLevel) => void;
  confirmAccountsByKeys: (level: ConfidenceLevel, keys: string[]) => void;
  resetBandConfirmation: (level: ConfidenceLevel) => void;
  hydrateConfirmation: () => Promise<void>;
  deleteAccount: (sourceType: string, sourceName: string, suggestionId?: string) => void;
  restoreAccount: (deletedIdx: number) => void;

  toggleAccountSelection: (sourceType: string, account: AccountMapping) => void;
  setSelectionForKeys: (keys: string[], selected: boolean) => void;
  clearSelection: () => void;
  bulkDeleteSelected: () => void;

  clearTargetERP: () => void;
  clearSourceFile: () => void;
  clearTargetFile: () => void;
  clearMappingFile: () => void;
  clearPendingRemovals: () => void;
  setTargetTypes: (types: string[]) => void;

  invalidateFromStep: (step: number) => void;
  setProjectId: (id: string) => void;
  setWorkstreamId: (id: string | null) => void;
  setJobId: (jobId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: AppError | null) => void;
  reset: () => void;
}

export type MigrationStore = MigrationState & MigrationActions;

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: MigrationState = {
  currentStep: 0,
  completedSteps: [],

  sourceERP: null,
  targetERP: null,

  sourceFile: null,
  targetFile: null,
  mappingFile: null,
  sourceData: [],
  targetData: [],
  mappingData: [],

  typeMappingRows: [],
  hasUnsavedChanges: false,
  hasUnsavedTypeMappings: false,
  targetTypes: [],

  groupedMappings: [],
  confirmedHigh: false,
  confirmedMedium: false,
  confirmedLow: false,
  confirmedAccountKeys: {},
  confidenceFilter: null,
  selection: {},

  pendingSourceRemoval: false,
  pendingTargetRemoval: false,
  pendingMappingRemoval: false,

  projectId: null,
  workstreamId: null,
  jobId: null,
  isLoading: false,
  error: null,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function clearDownstreamState(state: MigrationState, fromStep: number): void {
  state.completedSteps = state.completedSteps.filter((s) => s < fromStep);
  if (state.currentStep >= fromStep) {
    state.currentStep = fromStep - 1;
  }
  if (fromStep <= 1) {
    state.sourceFile = null;
    state.sourceData = [];
    state.targetFile = null;
    state.targetData = [];
    state.mappingFile = null;
    state.mappingData = [];
  }
  if (fromStep <= 2) {
    state.jobId = null;
    state.typeMappingRows = [];
    state.hasUnsavedChanges = false;
    state.hasUnsavedTypeMappings = false;
    state.targetTypes = [];
  }
  if (fromStep <= 3) {
    state.groupedMappings = [];
    state.confirmedHigh = false;
    state.confirmedMedium = false;
    state.confirmedLow = false;
    state.confirmedAccountKeys = {};
    state.selection = {};
  }
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

const CONFIRMATION_STORAGE_KEY = 'coa_migration_confirmation';

interface PersistedConfirmation {
  projectId: string | null;
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  confirmedAccountKeys: Record<string, true>;
  confidenceFilter: ConfidenceLevel | null;
}

function saveConfirmation(data: PersistedConfirmation): void {
  storageService.set(CONFIRMATION_STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}

function clearConfirmation(): void {
  storageService.remove(CONFIRMATION_STORAGE_KEY).catch(() => {});
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useMigrationStore = create<MigrationStore>()(
  immer((set) => ({
    ...initialState,

    setStep: (step: number): void => {
      set((state) => {
        state.currentStep = step;
      });
    },

    completeStep: (step: number): void => {
      set((state) => {
        if (!state.completedSteps.includes(step)) {
          state.completedSteps.push(step);
        }
      });
    },

    setSourceERP: (erp: ERPSystem): void => {
      set((state) => {
        const changed = state.sourceERP !== null && state.sourceERP.id !== erp.id;
        if (changed && state.completedSteps.includes(0)) {
          clearDownstreamState(state, 1);
        }
        state.sourceERP = castDraft(erp);
      });
    },

    setTargetERP: (erp: ERPSystem): void => {
      set((state) => {
        const changed = state.targetERP !== null && state.targetERP.id !== erp.id;
        if (changed && state.completedSteps.includes(0)) {
          clearDownstreamState(state, 1);
        }
        state.targetERP = castDraft(erp);
      });
    },

    setSourceData: (file: UploadedFile, data: Record<string, unknown>[]): void => {
      set((state) => {
        const changed = state.sourceFile !== null && state.sourceFile.fileId !== file.fileId;
        if (changed && state.completedSteps.includes(1)) {
          clearDownstreamState(state, 2);
        }
        state.sourceFile = file;
        state.sourceData = data;
        state.pendingSourceRemoval = false;
      });
    },

    setTargetData: (file: UploadedFile, data: Record<string, unknown>[]): void => {
      set((state) => {
        const changed = state.targetFile !== null && state.targetFile.fileId !== file.fileId;
        if (changed && state.completedSteps.includes(1)) {
          clearDownstreamState(state, 2);
        }
        state.targetFile = file;
        state.targetData = data;
        state.pendingTargetRemoval = false;
      });
    },

    setMappingData: (file: UploadedFile, data: Record<string, unknown>[]): void => {
      set((state) => {
        const changed = state.mappingFile !== null && state.mappingFile.fileId !== file.fileId;
        if (changed && state.completedSteps.includes(1)) {
          clearDownstreamState(state, 2);
        }
        state.mappingFile = file;
        state.mappingData = data;
        state.pendingMappingRemoval = false;
      });
    },

    setCoa: (
      source: Record<string, unknown>[],
      target: Record<string, unknown>[],
    ): void => {
      set((state) => {
        // Re-fetching replaces step-1 inputs, so invalidate stale downstream
        // work (type mappings, grouped mappings) — mirrors setSourceData's
        // re-upload guard. fromStep 2 preserves step-1 inputs while clearing
        // step-2+; the synthetic files/data below are assigned afterwards.
        if (state.completedSteps.includes(1)) {
          clearDownstreamState(state, 2);
        }
        state.sourceData = source;
        state.targetData = target;
        state.sourceFile = {
          name: 'ERP Source COA',
          rowCount: source.length,
          fileId: createFileId('mcp-source'),
        };
        state.targetFile = {
          name: 'ERP Target COA',
          rowCount: target.length,
          fileId: createFileId('mcp-target'),
        };
        state.pendingSourceRemoval = false;
        state.pendingTargetRemoval = false;
      });
    },

    setTypeMappingRows: (rows: TypeMappingRow[]): void => {
      set((state) => {
        state.hasUnsavedTypeMappings = true;
        state.typeMappingRows = rows.map((r) => ({
          ...r,
          targetTypes: [...r.targetTypes],
        }));
      });
    },

    hydrateTypeMappingRows: (rows: TypeMappingRow[]): void => {
      set((state) => {
        state.typeMappingRows = rows.map((r) => ({
          ...r,
          targetTypes: [...r.targetTypes],
        }));
      });
    },

    updateTypeMappingRow: (
      id: string,
      update: Partial<Pick<TypeMappingRow, 'sourceType' | 'targetTypes'>>,
    ): void => {
      set((state) => {
        const row = state.typeMappingRows.find((r) => r.id === id);
        if (!row) return;
        state.hasUnsavedTypeMappings = true;
        state.hasUnsavedChanges = true;
        if (update.sourceType !== undefined) {
          row.sourceType = update.sourceType;
        }
        if (update.targetTypes !== undefined) {
          row.targetTypes = [...update.targetTypes];
        }
      });
    },

    addTypeMappingRow: (): void => {
      set((state) => {
        state.hasUnsavedTypeMappings = true;
        state.hasUnsavedChanges = true;
        const newRow: TypeMappingRow = {
          id: Date.now().toString(),
          sourceType: '',
          targetTypes: [],
          isCustom: true,
        };
        state.typeMappingRows.push(castDraft(newRow));
      });
    },

    deleteTypeMappingRow: (id: string): void => {
      set((state) => {
        state.hasUnsavedTypeMappings = true;
        state.hasUnsavedChanges = true;
        state.typeMappingRows = state.typeMappingRows.filter((r) => r.id !== id);
      });
    },

    markChangesSaved: (): void => {
      set((state) => {
        state.hasUnsavedChanges = false;
      });
    },

    markTypeMappingsSaved: (): void => {
      set((state) => {
        state.hasUnsavedTypeMappings = false;
      });
    },

    setGroupedMappings: (mappings: GroupedMapping[]): void => {
      set((state) => {
        state.groupedMappings = castDraft(mappings);

        const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;
        const bandConfirmed: Record<ConfidenceLevel, number> = { high: 0, medium: 0, low: 0 };

        // First pass: adopt server-confirmed statuses into confirmedAccountKeys.
        // The suggestions endpoint already carries the true mapping_status
        // (normalized to 'confirmed' by the adapter) — this is what makes
        // confirmed rows, their checkbox lock, and the checked state show up
        // correctly on a brand-new session/device that never wrote to this
        // browser's localStorage. Only ever ADD here (never remove) so an
        // in-flight optimistic confirm from confirmAccountsByKeys can't be
        // raced/undone by a suggestions refetch that hasn't caught up yet.
        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            const k = selectionKey(group.source_type, account);
            if ((account as { status?: string }).status === 'confirmed') {
              state.confirmedAccountKeys[k] = true;
            }
          }
        }

        // Second pass: re-apply confirmedAccountKeys (now server+local union)
        // onto the account list, keep the checkbox checked, and tally
        // confirmed counts per band from the FULL suggestion list (including
        // rows never materialized into coa_mappings).
        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            const k = selectionKey(group.source_type, account);
            if (state.confirmedAccountKeys[k]) {
              (account as { status: string }).status = 'confirmed';
              state.selection[k] = true;
            }
            if (account.is_active === false) continue;
            const s = Math.round(account.score);
            const level: ConfidenceLevel = s >= HIGH ? 'high' : s >= MEDIUM ? 'medium' : 'low';
            if (state.confirmedAccountKeys[k]) bandConfirmed[level] += 1;
          }
        }

        // "Edit & Reconfirm" shows as soon as ANY account in the band is
        // confirmed — matches confirmAccountsByKeys' immediate local flag,
        // so the button doesn't flip on the next reload once this
        // server-truth recompute runs.
        state.confirmedHigh = bandConfirmed.high > 0;
        state.confirmedMedium = bandConfirmed.medium > 0;
        state.confirmedLow = bandConfirmed.low > 0;
      });
    },

    updateTypeMapping: (sourceType: string, targetType: string): void => {
      set((state) => {
        const group = state.groupedMappings.find(
          (g) => g.source_type === sourceType,
        );
        if (group) {
          group.target_type = targetType;
          state.hasUnsavedChanges = true;
        }
      });
    },

    updateAccountName: (
      sourceType: string,
      accountIdx: number,
      newName: string,
      userName: string,
      sourceName?: string,
      suggestionId?: string,
      targetNumber?: string | null,
    ): void => {
      set((state) => {
        const group = state.groupedMappings.find(
          (g) => g.source_type === sourceType,
        );
        if (!group) return;
        const account = suggestionId
          ? group.accounts.find((a) => a.suggestion_id === suggestionId)
          : sourceName
          ? group.accounts.find((a) => a.source_name === sourceName)
          : group.accounts[accountIdx];
        if (account) {
          account.target_name = newName;
          if (targetNumber !== undefined) account.target_number = targetNumber;
          account.user_changed = true;
          account.changed_by_name = userName;
          account.changed_at = new Date().toISOString();
          state.hasUnsavedChanges = true;
        }
      });
    },

    confirmConfidenceLevel: (level: ConfidenceLevel): void => {
      set((state) => {
        let isNowConfirmed = false;
        if (level === 'high') {
          state.confirmedHigh = !state.confirmedHigh;
          isNowConfirmed = state.confirmedHigh;
        } else if (level === 'medium') {
          state.confirmedMedium = !state.confirmedMedium;
          isNowConfirmed = state.confirmedMedium;
        } else if (level === 'low') {
          state.confirmedLow = !state.confirmedLow;
          isNowConfirmed = state.confirmedLow;
        }

        const newStatus = isNowConfirmed ? 'confirmed' : 'pending';
        const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;
        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            const s = Math.round(account.score);
            const inBand =
              (level === 'high' && s >= HIGH) ||
              (level === 'medium' && s >= MEDIUM && s < HIGH) ||
              (level === 'low' && s < MEDIUM);
            if (inBand) {
              (account as { status: string }).status = newStatus;
            }
          }
        }
      });
    },

    confirmAccountsByKeys: (level: ConfidenceLevel, keys: string[]): void => {
      const confirmedSuggestionIds: string[] = [];
      const deselectedSuggestionIds: string[] = [];

      set((state) => {
        const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;
        const keySet = new Set(keys);
        let anyInBandConfirmed = false;

        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            if (account.is_active === false) continue;
            const s = Math.round(account.score);
            const inBand =
              (level === 'high' && s >= HIGH) ||
              (level === 'medium' && s >= MEDIUM && s < HIGH) ||
              (level === 'low' && s < MEDIUM);
            if (!inBand) continue;

            const k = selectionKey(group.source_type, account);
            if (keySet.has(k)) {
              (account as { status: string }).status = 'confirmed';
              account.mapping_status = 'approved';
              state.confirmedAccountKeys[k] = true;
              // Mirror the lock into `selection` immediately — don't wait for
              // the next setGroupedMappings sync — so the checkbox shows
              // checked right away, including the "nothing checked → confirm
              // all" fallback case where these keys were never toggled.
              state.selection[k] = true;
              anyInBandConfirmed = true;
              if (account.suggestion_id) confirmedSuggestionIds.push(account.suggestion_id);
            } else {
              (account as { status?: string }).status = 'pending';
              account.mapping_status = 'suggested';
              delete state.confirmedAccountKeys[k];
              delete state.selection[k];
              if (account.suggestion_id) deselectedSuggestionIds.push(account.suggestion_id);
            }
          }
        }

        // "Edit & Reconfirm" shows as soon as ANY account in the band is
        // confirmed — must match setGroupedMappings' server-truth recompute
        // exactly, or the button flips on the next reload once that stricter
        // (or looser) check runs against fetched data.
        if (anyInBandConfirmed) {
          if (level === 'high') state.confirmedHigh = true;
          else if (level === 'medium') state.confirmedMedium = true;
          else state.confirmedLow = true;
        }
      });
      // Persist after the immer set so getState() sees the committed values.
      const s = useMigrationStore.getState();
      saveConfirmation({
        projectId: s.projectId,
        confirmedHigh: s.confirmedHigh,
        confirmedMedium: s.confirmedMedium,
        confirmedLow: s.confirmedLow,
        confirmedAccountKeys: s.confirmedAccountKeys,
        confidenceFilter: s.confidenceFilter,
      });
      // Fire-and-forget: local state above is the source of truth for the UI.
      // A failed save means the server falls out of sync — the confirmed
      // status shown now will silently revert on the next reload/session
      // once server truth is re-fetched. Log loudly so a real failure here
      // (auth, validation, network) isn't mistaken for a UI bug later.
      if (s.projectId && (confirmedSuggestionIds.length > 0 || deselectedSuggestionIds.length > 0)) {
        void confirmBand(httpClient, s.projectId, level, confirmedSuggestionIds, deselectedSuggestionIds).then(
          (result) => {
            if (!result.ok) {
              console.error('[migration.store] confirm-band request failed — this confirmation will not survive a reload:', result.error);
            }
          },
        );
      }
    },

    resetBandConfirmation: (level: ConfidenceLevel): void => {
      const deselectedSuggestionIds: string[] = [];

      set((state) => {
        const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;
        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            if (account.is_active === false) continue;
            const s = Math.round(account.score);
            const inBand =
              (level === 'high' && s >= HIGH) ||
              (level === 'medium' && s >= MEDIUM && s < HIGH) ||
              (level === 'low' && s < MEDIUM);
            if (!inBand) continue;
            (account as { status?: string }).status = 'pending';
            account.mapping_status = 'suggested';
            const k = selectionKey(group.source_type, account);
            delete state.confirmedAccountKeys[k];
            // Keep the checkbox as-is — "Edit & Reconfirm" unlocks the band
            // for editing but shouldn't wipe the user's prior picks. They
            // can uncheck/adjust individual rows before pressing Confirm
            // again; a blank slate would force reselecting everything.
            if (account.suggestion_id) deselectedSuggestionIds.push(account.suggestion_id);
          }
        }
        if (level === 'high') state.confirmedHigh = false;
        else if (level === 'medium') state.confirmedMedium = false;
        else state.confirmedLow = false;
      });
      const s = useMigrationStore.getState();
      saveConfirmation({
        projectId: s.projectId,
        confirmedHigh: s.confirmedHigh,
        confirmedMedium: s.confirmedMedium,
        confirmedLow: s.confirmedLow,
        confirmedAccountKeys: s.confirmedAccountKeys,
        confidenceFilter: s.confidenceFilter,
      });
      if (s.projectId && deselectedSuggestionIds.length > 0) {
        void confirmBand(httpClient, s.projectId, level, [], deselectedSuggestionIds).then((result) => {
          if (!result.ok) {
            console.error('[migration.store] confirm-band reset request failed — this reset will not survive a reload:', result.error);
          }
        });
      }
    },

    deleteAccount: (sourceType: string, sourceName: string, suggestionId?: string): void => {
      set((state) => {
        const group = state.groupedMappings.find(
          (g) => g.source_type === sourceType,
        );
        if (!group) return;
        const account = suggestionId
          ? group.accounts.find((a) => a.suggestion_id === suggestionId)
          : group.accounts.find((a) => a.source_name === sourceName);
        if (!account) return;
        (account as { is_active?: boolean }).is_active = false;
        state.hasUnsavedChanges = true;
      });
    },

    restoreAccount: (deletedIdx: number): void => {
      set((state) => {
        let seen = 0;
        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            if (account.is_active === false) {
              if (seen === deletedIdx) {
                (account as { is_active?: boolean }).is_active = true;
                state.hasUnsavedChanges = true;
                return;
              }
              seen += 1;
            }
          }
        }
      });
    },

    toggleAccountSelection: (sourceType: string, account: AccountMapping): void => {
      set((state) => {
        const k = selectionKey(sourceType, account);
        if (state.selection[k]) {
          delete state.selection[k];
        } else {
          state.selection[k] = true;
        }
      });
    },

    setSelectionForKeys: (keys: string[], selected: boolean): void => {
      set((state) => {
        for (const key of keys) {
          if (selected) {
            state.selection[key] = true;
          } else {
            delete state.selection[key];
          }
        }
      });
    },

    clearSelection: (): void => {
      set((state) => {
        // Confirmed/locked rows stay checked — "Clear" only affects rows the
        // user picked ahead of a pending confirm/delete action.
        for (const key of Object.keys(state.selection)) {
          if (!state.confirmedAccountKeys[key]) {
            delete state.selection[key];
          }
        }
      });
    },

    bulkDeleteSelected: (): void => {
      set((state) => {
        for (const group of state.groupedMappings) {
          for (const account of group.accounts) {
            const k = selectionKey(group.source_type, account);
            if (!state.selection[k]) continue;
            if (state.confirmedAccountKeys[k]) continue; // locked — not deletable via bulk action
            (account as { is_active?: boolean }).is_active = false;
            delete state.selection[k];
          }
        }
        state.hasUnsavedChanges = true;
      });
    },

    clearTargetERP: (): void => {
      set((state) => {
        state.targetERP = null;
      });
    },

    clearSourceFile: (): void => {
      set((state) => {
        if (state.completedSteps.includes(1)) {
          state.pendingSourceRemoval = true;
        } else {
          state.sourceFile = null;
          state.sourceData = [];
        }
      });
    },

    clearTargetFile: (): void => {
      set((state) => {
        if (state.completedSteps.includes(1)) {
          state.pendingTargetRemoval = true;
        } else {
          state.targetFile = null;
          state.targetData = [];
        }
      });
    },

    clearMappingFile: (): void => {
      set((state) => {
        if (state.completedSteps.includes(1)) {
          state.pendingMappingRemoval = true;
        } else {
          state.mappingFile = null;
          state.mappingData = [];
        }
      });
    },

    clearPendingRemovals: (): void => {
      set((state) => {
        state.pendingSourceRemoval = false;
        state.pendingTargetRemoval = false;
        state.pendingMappingRemoval = false;
      });
    },

    setTargetTypes: (types: string[]): void => {
      set((state) => {
        state.targetTypes = types;
      });
    },

    invalidateFromStep: (step: number): void => {
      set((state) => {
        clearDownstreamState(state, step);
      });
    },

    setProjectId: (id: string): void => {
      set((state) => {
        if (state.projectId !== id) {
          state.confidenceFilter = null;
        }
        state.projectId = id;
      });
    },

    setWorkstreamId: (id: string | null): void => {
      set((state) => {
        state.workstreamId = id;
      });
    },

    setJobId: (jobId: string | null): void => {
      set((state) => {
        state.jobId = jobId;
      });
    },

    setLoading: (loading: boolean): void => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setError: (error: AppError | null): void => {
      set((state) => {
        state.error = error;
      });
    },

    setConfidenceFilter: (filter: ConfidenceLevel | null): void => {
      set((state) => {
        state.confidenceFilter = filter;
      });
    },

    hydrateConfirmation: async (): Promise<void> => {
      try {
        const raw = await storageService.get(CONFIRMATION_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<PersistedConfirmation>;
        const currentProjectId = useMigrationStore.getState().projectId;
        // Only restore if the stored data belongs to the current project.
        if (saved.projectId && saved.projectId !== currentProjectId) return;
        set((state) => {
          if (saved.confirmedHigh !== undefined) state.confirmedHigh = saved.confirmedHigh;
          if (saved.confirmedMedium !== undefined) state.confirmedMedium = saved.confirmedMedium;
          if (saved.confirmedLow !== undefined) state.confirmedLow = saved.confirmedLow;
          if (saved.confirmedAccountKeys) state.confirmedAccountKeys = saved.confirmedAccountKeys;
          if (saved.confidenceFilter !== undefined) state.confidenceFilter = saved.confidenceFilter;
        });
      } catch {
        // Corrupt or missing data — ignore and continue with defaults.
      }
    },

    reset: (): void => {
      set((state) => ({ ...initialState, confidenceFilter: state.confidenceFilter }));
    },
  })),
);
