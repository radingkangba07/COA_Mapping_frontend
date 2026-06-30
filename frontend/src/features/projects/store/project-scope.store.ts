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
    // so the page is not blocked on mount (DA-48).
    sourceMethod: 'csv',
    targetMethod: 'csv',
    sourceConnection: { ...INITIAL_CONNECTION, scope: 'source', headers: [] },
    targetConnection: { ...INITIAL_CONNECTION, scope: 'target', headers: [] },
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
  sourceConnectionReady: false,
  targetConnectionReady: false,
  testStatus: 'idle',
  fetchStatus: 'idle',
  isSavingDraft: false,
  error: null,
};

// ─── Serialization ──────────────────────────────────────────────────────────

// Merges a partial connection patch into an immer draft connection in place,
// preserving every untouched field. Shared by both per-side update actions.
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
  connection: ProjectScopeDraft['sourceConnection'],
): ProjectDraftPayload['source_connection'] {
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
    // LEGACY: mirror the source connection for features/migration's fetch.
    connection: serializeConnection(draft.sourceConnection),
    source_method: draft.sourceMethod,
    target_method: draft.targetMethod,
    source_connection: serializeConnection(draft.sourceConnection),
    target_connection: serializeConnection(draft.targetConnection),
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

    updateSourceConnection: (patch: Partial<MCPConnection>): void => {
      set((state) => {
        applyConnectionPatch(state.draft.sourceConnection, patch);
      });
    },

    updateTargetConnection: (patch: Partial<MCPConnection>): void => {
      set((state) => {
        applyConnectionPatch(state.draft.targetConnection, patch);
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

    setSourceConnectionReady: (ready: boolean): void => {
      set((state) => {
        state.sourceConnectionReady = ready;
        // Mirror onto the LEGACY gate (source-driven) so features/migration's
        // useFetchFromErp opens after a successful source/both test connection.
        state.connectionReady = ready;
      });
    },

    setTargetConnectionReady: (ready: boolean): void => {
      set((state) => {
        state.targetConnectionReady = ready;
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
