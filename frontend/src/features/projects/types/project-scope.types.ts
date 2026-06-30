import type { AppError, Result } from '@/shared/types/result.types';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { ProjectPermission } from './project-access.types';

// ─── Value Objects ──────────────────────────────────────────────────────────

export type McpScope = 'source' | 'target';
export type McpAuthType = 'none' | 'bearer' | 'basic' | 'apiKey';
export type ConnectionMethod = 'mcp' | 'csv';
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface McpHeader {
  readonly key: string;
  readonly value: string;
}

export interface MCPConnection {
  readonly scope: McpScope;
  readonly url: string;
  readonly token: string; // secret — redacted in logs
  readonly authType: McpAuthType;
  readonly headers: readonly McpHeader[];
  readonly skipSSL: boolean;
  readonly proxy: string;
  readonly timeout: number; // milliseconds
}

// CoaRow MUST be a structural superset of the CSV parser row (Record<string, unknown>)
// so Type Mapping & Account Mapping consume MCP-fetched data identically (DA-52 setCoa same shape).
export interface CoaRow {
  readonly accountCode: string;
  readonly accountName: string;
  readonly accountType: string;
  readonly parent: string | null;
  readonly [column: string]: unknown; // dynamic CSV columns
}

// ─── Migration Scope Slice ──────────────────────────────────────────────────

export type AggregationMode = 'none' | 'byType' | 'byParent';

export interface MigrationScope {
  readonly selectedMasterData: readonly string[];
  readonly selectedOpeningBalances: readonly string[];
  readonly aggregation: AggregationMode;
}

// ─── Members Slice ──────────────────────────────────────────────────────────

export interface ProjectScopeMember {
  readonly id: string; // userId or invite email used as stable key
  readonly name: string;
  readonly email: string;
  readonly role: ProjectPermission;
}

// ─── Draft + Store Contracts ────────────────────────────────────────────────

export interface ProjectScopeDraft {
  readonly companyId: string | null; // seeded from entry modal
  readonly name: string; // MANUAL name from modal — no auto-name/dirty logic
  readonly description: string; // from modal
  readonly source: string | null; // source ERP id
  readonly target: string | null; // target ERP id
  // LEGACY single method — retained ONLY for the untouchable features/migration
  // consumer (UploadScreen / useFetchFromErp). The PER-SIDE fields below are the
  // source of truth for the Project Scope page + Create gate (DA-48).
  readonly method: ConnectionMethod;
  // Connection method is PER-SIDE and independent (DA-48). Defaults to 'csv' on
  // both sides so the page is not blocked by a pending test connection.
  readonly sourceMethod: ConnectionMethod;
  readonly targetMethod: ConnectionMethod;
  // Per-side, independent MCP connections (extends the DA-53 single connection).
  readonly sourceConnection: MCPConnection; // scope: 'source'
  readonly targetConnection: MCPConnection; // scope: 'target'
  readonly scope: MigrationScope;
  readonly members: readonly ProjectScopeMember[];
}

export interface ProjectScopeSeed {
  readonly companyId: string | null;
  readonly name: string;
  readonly description?: string;
}

export interface ProjectScopeState {
  readonly draft: ProjectScopeDraft;
  // LEGACY single gate — retained ONLY for the untouchable features/migration
  // consumer (useFetchFromErp). Mirrors the SOURCE side's readiness (DA-48).
  readonly connectionReady: boolean;
  // PER-SIDE gates (DA-48): each set true only after a SUCCESSFUL test connection
  // for that side (DA-50).
  readonly sourceConnectionReady: boolean;
  readonly targetConnectionReady: boolean;
  readonly testStatus: RequestStatus; // shared status for Test Connection panel
  readonly fetchStatus: RequestStatus; // shared status for Fetch-from-ERP
  readonly isSavingDraft: boolean;
  readonly error: AppError | null;
}

export interface ProjectScopeActions {
  initFromSeed: (seed: ProjectScopeSeed) => void;
  setCompanyId: (companyId: string | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setSource: (erpId: string | null) => void;
  setTarget: (erpId: string | null) => void;
  // LEGACY — retained for features/migration's useCsvFallback. Sets only the
  // legacy `method` field; per-side setters below drive the page.
  setMethod: (method: ConnectionMethod) => void;
  setSourceMethod: (method: ConnectionMethod) => void;
  setTargetMethod: (method: ConnectionMethod) => void;
  updateSourceConnection: (patch: Partial<MCPConnection>) => void;
  updateTargetConnection: (patch: Partial<MCPConnection>) => void;
  toggleMasterData: (id: string) => void;
  setMasterData: (ids: readonly string[]) => void;
  toggleOpeningBalances: (id: string) => void;
  setOpeningBalances: (ids: readonly string[]) => void;
  setAggregation: (mode: AggregationMode) => void;
  addMember: (member: ProjectScopeMember) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (id: string, role: ProjectPermission) => void;
  // LEGACY — retained for features/migration tests. Sets only the legacy gate.
  setConnectionReady: (ready: boolean) => void;
  setSourceConnectionReady: (ready: boolean) => void;
  setTargetConnectionReady: (ready: boolean) => void;
  setTestStatus: (status: RequestStatus) => void;
  setFetchStatus: (status: RequestStatus) => void;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  saveDraft: (client: HttpClient) => Promise<Result<void, AppError>>;
  reset: () => void;
}

export type ProjectScopeStore = ProjectScopeState & ProjectScopeActions;

// ─── Serialized API Payload (snake_case to match API surface) ───────────────

export interface MCPConnectionPayload {
  readonly scope: McpScope;
  readonly url: string;
  readonly token: string;
  readonly auth_type: McpAuthType;
  readonly headers: { key: string; value: string }[];
  readonly skip_ssl: boolean;
  readonly proxy: string;
  readonly timeout: number;
}

export interface MigrationScopePayload {
  readonly selected_master_data: string[];
  readonly selected_opening_balances: string[];
  readonly aggregation: AggregationMode;
}

export interface ProjectScopeMemberPayload {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: ProjectPermission;
}

export interface ProjectDraftPayload {
  readonly company_id: string | null;
  readonly name: string;
  readonly description: string;
  readonly source_erp: string | null;
  readonly target_erp: string | null;
  // LEGACY single connection — retained ONLY for features/migration's
  // useFetchFromErp, which reads `serialized.connection`. Mirrors the source.
  readonly connection: MCPConnectionPayload;
  readonly source_method: ConnectionMethod;
  readonly target_method: ConnectionMethod;
  readonly source_connection: MCPConnectionPayload;
  readonly target_connection: MCPConnectionPayload;
  readonly scope: MigrationScopePayload;
  readonly members: ProjectScopeMemberPayload[];
}
