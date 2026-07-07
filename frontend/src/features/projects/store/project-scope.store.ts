import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { WritableDraft } from 'immer';
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
    // LEGACY method preserves the migration UploadScreen default ('mcp').
    method: 'mcp',
    // PER-SIDE methods default to 'csv' (File Upload needs no test connection),
    // so the page is not blocked on mount.
    sourceMethod: 'csv',
    targetMethod: 'csv',
    connection: { ...INITIAL_CONNECTION, headers: [] },
    scope: {
      selectedMasterData: [],
      selectedOpeningBalances: [],
      aggregation: 'none',
    },
    members: [
      { id: 'dummy-1', name: 'John Smith', email: 'john.smith@example.com', role: 'admin' },
      { id: 'dummy-2', name: 'Sarah Johnson', email: 'sarah.johnson@example.com', role: 'editor' },
      { id: 'dummy-3', name: 'Michael Brown', email: 'michael.brown@example.com', role: 'viewer' },
    ],
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

// Merges a partial connection patch into an immer draft connection in place,
// preserving every untouched field.
function applyConnectionPatch(
  target: WritableDraft<MCPConnection>,
  patch: Partial<MCPConnection>,
): void {
  const merged: MCPConnection = { ...target, ...patch };
  target.scope = merged.scope;
  target.url = merged.url;
  target.token = merged.token;
  target.authType = merged.authType;
  target.headers = [...merged.headers];
  target.skipSSL = merged.skipSSL;
  target.proxy = merged.proxy;
  target.timeout = merged.timeout;
}

function serializeConnection(
  connection: ProjectScopeDraft['connection'],
): ProjectDraftPayload['connection'] {
  return {
    scope: connection.scope,
    url: connection.url,
    token: connection.token,
    auth_type: connection.authType,
    headers: connection.headers.map((header) => ({
      key: header.key,
      value: header.value,
    })),
    skip_ssl: connection.skipSSL,
    proxy: connection.proxy,
    timeout: connection.timeout,
  };
}

export function serializeProjectScopeDraft(
  draft: ProjectScopeDraft,
): ProjectDraftPayload {
  return {
    company_id: draft.companyId,
    name: draft.name,
    description: draft.description,
    source_erp: draft.source,
    target_erp: draft.target,
    connection: serializeConnection(draft.connection),
    source_method: draft.sourceMethod,
    target_method: draft.targetMethod,
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
        state.draft.name = seed.name ?? '';
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

    // LEGACY combined setter (features/migration's useCsvFallback). Sets the
    // legacy field AND both per-side methods so a single 'csv' fallback flips
    // the whole draft, keeping the per-side Create gate consistent (DA-48).
    setMethod: (method: ConnectionMethod): void => {
      set((state) => {
        state.draft.method = method;
        state.draft.sourceMethod = method;
        state.draft.targetMethod = method;
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
        applyConnectionPatch(state.draft.connection, patch);
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
        const index = state.draft.members.findIndex((m) => m.id === member.id);
        if (index === -1) {
          state.draft.members.push(member);
        } else {
          state.draft.members[index] = member;
        }
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
