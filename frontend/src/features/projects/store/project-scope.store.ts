import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError, Result } from '@/shared/types/result.types';
import type { ProjectPermission } from '../types/project-access.types';
import type {
  AggregationMode,
  ConnectionMethod,
  MCPConnection,
  MigrationScope,
  ProjectDraftPayload,
  ProjectScopeDraft,
  ProjectScopeMember,
  ProjectScopeSeed,
  ProjectScopeState,
  ProjectScopeStore,
  RequestStatus,
} from '../types/project-scope.types';
import { saveProjectDraft } from '../services/projects.service';

// ─── Initial Values ──────────────────────────────────────────────────────────

export const INITIAL_CONNECTION: MCPConnection = {
  scope: 'source',
  url: '',
  token: '',
  authType: 'none',
  headers: [],
  skipSSL: false,
  proxy: '',
  timeout: 30000,
};

export const INITIAL_SCOPE: MigrationScope = {
  selectedMasterData: [],
  selectedOpeningBalances: [],
  aggregation: 'none',
};

export function createInitialDraft(): ProjectScopeDraft {
  return {
    companyId: null,
    name: '',
    description: '',
    source: null,
    target: null,
    sourceMethod: 'mcp',
    targetMethod: 'mcp',
    connection: { ...INITIAL_CONNECTION, headers: [] },
    scope: {
      selectedMasterData: [],
      selectedOpeningBalances: [],
      aggregation: 'none',
    },
    members: [],
  };
}

export const initialState: ProjectScopeState = {
  draft: createInitialDraft(),
  connectionReady: false,
  testStatus: 'idle',
  fetchStatus: 'idle',
  isSavingDraft: false,
  error: null,
};

// ─── Serialization ──────────────────────────────────────────────────────────

export function serializeProjectScopeDraft(
  draft: ProjectScopeDraft,
): ProjectDraftPayload {
  return {
    company_id: draft.companyId,
    name: draft.name,
    description: draft.description,
    source_erp: draft.source,
    target_erp: draft.target,
    source_method: draft.sourceMethod,
    target_method: draft.targetMethod,
    connection: {
      scope: draft.connection.scope,
      url: draft.connection.url,
      token: draft.connection.token,
      auth_type: draft.connection.authType,
      headers: draft.connection.headers.map((header) => ({
        key: header.key,
        value: header.value,
      })),
      skip_ssl: draft.connection.skipSSL,
      proxy: draft.connection.proxy,
      timeout: draft.connection.timeout,
    },
    scope: {
      selected_master_data: [...draft.scope.selectedMasterData],
      selected_opening_balances: [...draft.scope.selectedOpeningBalances],
      aggregation: draft.scope.aggregation,
    },
    members: draft.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    })),
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProjectScopeStore = create<ProjectScopeStore>()(
  immer((set, get) => ({
    ...initialState,

    initFromSeed: (seed: ProjectScopeSeed): void => {
      set((state) => {
        state.draft.companyId = seed.companyId;
        state.draft.name = seed.name;
        state.draft.description = seed.description ?? '';
      });
    },

    setCompanyId: (companyId: string | null): void => {
      set((state) => {
        state.draft.companyId = companyId;
      });
    },

    setName: (name: string): void => {
      set((state) => {
        state.draft.name = name;
      });
    },

    setDescription: (description: string): void => {
      set((state) => {
        state.draft.description = description;
      });
    },

    setSource: (erpId: string | null): void => {
      set((state) => {
        state.draft.source = erpId;
      });
    },

    setTarget: (erpId: string | null): void => {
      set((state) => {
        state.draft.target = erpId;
      });
    },

    setSourceMethod: (method: ConnectionMethod): void => {
      set((state) => {
        state.draft.sourceMethod = method;
      });
    },

    setTargetMethod: (method: ConnectionMethod): void => {
      set((state) => {
        state.draft.targetMethod = method;
      });
    },

    updateConnection: (patch: Partial<MCPConnection>): void => {
      set((state) => {
        const merged: MCPConnection = { ...state.draft.connection, ...patch };
        state.draft.connection.scope = merged.scope;
        state.draft.connection.url = merged.url;
        state.draft.connection.token = merged.token;
        state.draft.connection.authType = merged.authType;
        state.draft.connection.headers = [...merged.headers];
        state.draft.connection.skipSSL = merged.skipSSL;
        state.draft.connection.proxy = merged.proxy;
        state.draft.connection.timeout = merged.timeout;
      });
    },

    toggleMasterData: (id: string): void => {
      set((state) => {
        const list = state.draft.scope.selectedMasterData;
        const index = list.indexOf(id);
        if (index === -1) {
          list.push(id);
        } else {
          list.splice(index, 1);
        }
      });
    },

    setMasterData: (ids: readonly string[]): void => {
      set((state) => {
        state.draft.scope.selectedMasterData = [...ids];
      });
    },

    toggleOpeningBalances: (id: string): void => {
      set((state) => {
        const list = state.draft.scope.selectedOpeningBalances;
        const index = list.indexOf(id);
        if (index === -1) {
          list.push(id);
        } else {
          list.splice(index, 1);
        }
      });
    },

    setOpeningBalances: (ids: readonly string[]): void => {
      set((state) => {
        state.draft.scope.selectedOpeningBalances = [...ids];
      });
    },

    setAggregation: (mode: AggregationMode): void => {
      set((state) => {
        state.draft.scope.aggregation = mode;
      });
    },

    addMember: (member: ProjectScopeMember): void => {
      set((state) => {
        state.draft.members.push(member);
      });
    },

    removeMember: (id: string): void => {
      set((state) => {
        state.draft.members = state.draft.members.filter(
          (member) => member.id !== id,
        );
      });
    },

    updateMemberRole: (id: string, role: ProjectPermission): void => {
      set((state) => {
        const member = state.draft.members.find((m) => m.id === id);
        if (member) {
          member.role = role;
        }
      });
    },

    setConnectionReady: (ready: boolean): void => {
      set((state) => {
        state.connectionReady = ready;
      });
    },

    setTestStatus: (status: RequestStatus): void => {
      set((state) => {
        state.testStatus = status;
      });
    },

    setFetchStatus: (status: RequestStatus): void => {
      set((state) => {
        state.fetchStatus = status;
      });
    },

    setError: (error: AppError | null): void => {
      set((state) => {
        state.error = error;
      });
    },

    clearError: (): void => {
      set((state) => {
        state.error = null;
      });
    },

    saveDraft: async (
      client: HttpClient,
    ): Promise<Result<void, AppError>> => {
      set((state) => {
        state.isSavingDraft = true;
      });

      const payload = serializeProjectScopeDraft(get().draft);
      const result = await saveProjectDraft(client, payload);

      set((state) => {
        state.isSavingDraft = false;
        if (!result.ok) {
          state.error = result.error;
        }
      });

      return result;
    },

    reset: (): void => {
      set(() => ({ ...initialState, draft: createInitialDraft() }));
    },
  })),
);
