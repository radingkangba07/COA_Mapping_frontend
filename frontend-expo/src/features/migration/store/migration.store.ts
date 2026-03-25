import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type {
  UploadedFile,
  TypeMappingRow,
  DeletedAccount,
} from '@/features/migration/types/migration.types';
import type {
  GroupedMapping,
  AccountMapping,
  ConfidenceLevel,
} from '@/features/migration/types/mapping.types';
import type { AppError } from '@/shared/types/result.types';

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
  targetTypes: string[];

  groupedMappings: GroupedMapping[];
  confidenceFilter: ConfidenceLevel | null;
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  deletedAccounts: DeletedAccount[];

  projectId: string | null;
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

  setTypeMappingRows: (rows: TypeMappingRow[]) => void;
  updateTypeMappingRow: (id: string, field: 'sourceType' | 'targetType', value: string) => void;
  addTypeMappingRow: () => void;
  deleteTypeMappingRow: (id: string) => void;
  markChangesSaved: () => void;

  setGroupedMappings: (mappings: GroupedMapping[]) => void;
  updateTypeMapping: (sourceType: string, targetType: string) => void;
  updateAccountName: (
    sourceType: string,
    accountIdx: number,
    newName: string,
    userName: string,
  ) => void;
  setConfidenceFilter: (filter: ConfidenceLevel | null) => void;
  confirmConfidenceLevel: (level: ConfidenceLevel) => void;
  deleteAccount: (sourceType: string, accountIdx: number) => void;
  restoreAccount: (deletedIdx: number) => void;

  setProjectId: (id: string) => void;
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
  targetTypes: [],

  groupedMappings: [],
  confidenceFilter: null,
  confirmedHigh: false,
  confirmedMedium: false,
  confirmedLow: false,
  deletedAccounts: [],

  projectId: null,
  isLoading: false,
  error: null,
};

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
        state.sourceERP = erp;
      });
    },

    setTargetERP: (erp: ERPSystem): void => {
      set((state) => {
        state.targetERP = erp;
      });
    },

    setSourceData: (file: UploadedFile, data: Record<string, unknown>[]): void => {
      set((state) => {
        state.sourceFile = file;
        state.sourceData = data;
      });
    },

    setTargetData: (file: UploadedFile, data: Record<string, unknown>[]): void => {
      set((state) => {
        state.targetFile = file;
        state.targetData = data;
      });
    },

    setMappingData: (file: UploadedFile, data: Record<string, unknown>[]): void => {
      set((state) => {
        state.mappingFile = file;
        state.mappingData = data;
      });
    },

    setTypeMappingRows: (rows: TypeMappingRow[]): void => {
      set((state) => {
        state.typeMappingRows = rows;
      });
    },

    updateTypeMappingRow: (id: string, field: 'sourceType' | 'targetType', value: string): void => {
      set((state) => {
        const row = state.typeMappingRows.find((r) => r.id === id);
        if (row) {
          row[field] = value;
          state.hasUnsavedChanges = true;
        }
      });
    },

    addTypeMappingRow: (): void => {
      set((state) => {
        const newRow: TypeMappingRow = {
          id: Date.now().toString(),
          sourceType: '',
          targetType: '',
          isCustom: true,
        };
        state.typeMappingRows.push(newRow);
        state.hasUnsavedChanges = true;
      });
    },

    deleteTypeMappingRow: (id: string): void => {
      set((state) => {
        state.typeMappingRows = state.typeMappingRows.filter((r) => r.id !== id);
        state.hasUnsavedChanges = true;
      });
    },

    markChangesSaved: (): void => {
      set((state) => {
        state.hasUnsavedChanges = false;
      });
    },

    setGroupedMappings: (mappings: GroupedMapping[]): void => {
      set((state) => {
        state.groupedMappings = mappings;
      });
    },

    updateTypeMapping: (sourceType: string, targetType: string): void => {
      set((state) => {
        const group = state.groupedMappings.find(
          (g) => g.source_type === sourceType,
        );
        if (group) {
          group.target_type = targetType;
        }
      });
    },

    updateAccountName: (
      sourceType: string,
      accountIdx: number,
      newName: string,
      userName: string,
    ): void => {
      set((state) => {
        const group = state.groupedMappings.find(
          (g) => g.source_type === sourceType,
        );
        const account = group?.accounts[accountIdx];
        if (account) {
          account.target_name = newName;
          account.user_changed = true;
          account.changed_by_name = userName;
          account.changed_at = new Date().toISOString();
        }
      });
    },

    setConfidenceFilter: (filter: ConfidenceLevel | null): void => {
      set((state) => {
        state.confidenceFilter = filter;
      });
    },

    confirmConfidenceLevel: (level: ConfidenceLevel): void => {
      set((state) => {
        if (level === 'high') {
          state.confirmedHigh = true;
        } else if (level === 'medium') {
          state.confirmedMedium = true;
        } else if (level === 'low') {
          state.confirmedLow = true;
        }
      });
    },

    deleteAccount: (sourceType: string, accountIdx: number): void => {
      set((state) => {
        const group = state.groupedMappings.find(
          (g) => g.source_type === sourceType,
        );
        if (!group) return;

        const account = group.accounts[accountIdx];
        if (!account) return;

        const deleted: DeletedAccount = {
          sourceType,
          accountIndex: accountIdx,
          sourceNumber: account.source_number,
          sourceName: account.source_name,
        };
        state.deletedAccounts.push(deleted);
        group.accounts.splice(accountIdx, 1);
      });
    },

    restoreAccount: (deletedIdx: number): void => {
      set((state) => {
        const deleted = state.deletedAccounts[deletedIdx];
        if (!deleted) return;

        state.deletedAccounts.splice(deletedIdx, 1);

        let group = state.groupedMappings.find(
          (g) => g.source_type === deleted.sourceType,
        );

        if (!group) {
          const newGroup: GroupedMapping = {
            source_type: deleted.sourceType,
            target_type: '',
            confidence: 0,
            accounts: [],
          };
          state.groupedMappings.push(newGroup);
          group = state.groupedMappings[state.groupedMappings.length - 1];
        }

        if (group) {
          const restoredAccount: AccountMapping = {
            source_number: deleted.sourceNumber,
            source_name: deleted.sourceName,
            target_name: '',
            score: 0,
            remark: 'Restored',
          };
          group.accounts.push(restoredAccount);
        }
      });
    },

    setProjectId: (id: string): void => {
      set((state) => {
        state.projectId = id;
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

    reset: (): void => {
      set(() => ({ ...initialState }));
    },
  })),
);
