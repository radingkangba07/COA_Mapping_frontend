import {
  serializeProjectScopeDraft,
  useProjectScopeStore,
} from '@/features/projects/store/project-scope.store';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { ProjectScopeMember } from '@/features/projects/types/project-scope.types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const member: ProjectScopeMember = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'editor',
};

const okClient = {
  put: jest.fn().mockResolvedValue({ data: {} }),
} as unknown as HttpClient;

const failingClient = {
  put: jest.fn().mockRejectedValue(new Error('network down')),
} as unknown as HttpClient;

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useProjectScopeStore', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useProjectScopeStore.getState();
      expect(state.draft.companyId).toBeNull();
      expect(state.draft.name).toBe('');
      expect(state.draft.sourceMethod).toBe('mcp');
      expect(state.draft.targetMethod).toBe('mcp');
      expect(state.connectionReady).toBe(false);
      expect(state.testStatus).toBe('idle');
      expect(state.fetchStatus).toBe('idle');
      expect(state.isSavingDraft).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('initFromSeed', () => {
    it('seeds companyId, name and description and leaves other slices at defaults', () => {
      useProjectScopeStore.getState().initFromSeed({
        companyId: 'co-1',
        name: 'Migration A',
        description: 'desc',
      });

      const { draft } = useProjectScopeStore.getState();
      expect(draft.companyId).toBe('co-1');
      expect(draft.name).toBe('Migration A');
      expect(draft.description).toBe('desc');
      expect(draft.source).toBeNull();
      expect(draft.target).toBeNull();
      expect(draft.sourceMethod).toBe('mcp');
      expect(draft.targetMethod).toBe('mcp');
      expect(draft.connection.token).toBe('');
      expect(draft.scope.aggregation).toBe('none');
      expect(draft.members).toEqual([]);
    });

    it('defaults description to empty string when omitted', () => {
      useProjectScopeStore
        .getState()
        .initFromSeed({ companyId: 'co-1', name: 'Migration A' });

      expect(useProjectScopeStore.getState().draft.description).toBe('');
    });
  });

  describe('erp + method setters', () => {
    it('sets source and target', () => {
      const store = useProjectScopeStore.getState();
      store.setSource('sap');
      store.setTarget('xero');

      const { draft } = useProjectScopeStore.getState();
      expect(draft.source).toBe('sap');
      expect(draft.target).toBe('xero');
    });

    it('sets sourceMethod and targetMethod independently', () => {
      const store = useProjectScopeStore.getState();
      store.setSourceMethod('csv');
      store.setTargetMethod('mcp');

      const { draft } = useProjectScopeStore.getState();
      expect(draft.sourceMethod).toBe('csv');
      expect(draft.targetMethod).toBe('mcp');
    });
  });

  describe('updateConnection', () => {
    it('merges patch without dropping other fields', () => {
      useProjectScopeStore
        .getState()
        .updateConnection({ url: 'https://erp', token: 'abc' });

      const { connection } = useProjectScopeStore.getState().draft;
      expect(connection.url).toBe('https://erp');
      expect(connection.token).toBe('abc');
      expect(connection.timeout).toBe(30000);
      expect(connection.authType).toBe('none');
    });
  });

  describe('master data + opening balances', () => {
    it('toggleMasterData adds then removes the same id', () => {
      const store = useProjectScopeStore.getState();
      store.toggleMasterData('accounts');
      expect(
        useProjectScopeStore.getState().draft.scope.selectedMasterData,
      ).toEqual(['accounts']);

      store.toggleMasterData('accounts');
      expect(
        useProjectScopeStore.getState().draft.scope.selectedMasterData,
      ).toEqual([]);
    });

    it('setMasterData replaces the list', () => {
      useProjectScopeStore.getState().setMasterData(['a', 'b']);
      expect(
        useProjectScopeStore.getState().draft.scope.selectedMasterData,
      ).toEqual(['a', 'b']);
    });

    it('toggleOpeningBalances adds then removes the same id', () => {
      const store = useProjectScopeStore.getState();
      store.toggleOpeningBalances('ob');
      expect(
        useProjectScopeStore.getState().draft.scope.selectedOpeningBalances,
      ).toEqual(['ob']);

      store.toggleOpeningBalances('ob');
      expect(
        useProjectScopeStore.getState().draft.scope.selectedOpeningBalances,
      ).toEqual([]);
    });

    it('setOpeningBalances replaces the list', () => {
      useProjectScopeStore.getState().setOpeningBalances(['x']);
      expect(
        useProjectScopeStore.getState().draft.scope.selectedOpeningBalances,
      ).toEqual(['x']);
    });
  });

  describe('setAggregation', () => {
    it('sets the aggregation mode', () => {
      useProjectScopeStore.getState().setAggregation('byType');
      expect(useProjectScopeStore.getState().draft.scope.aggregation).toBe(
        'byType',
      );
    });
  });

  describe('members', () => {
    it('adds, updates the role of, and removes a member', () => {
      const store = useProjectScopeStore.getState();
      store.addMember(member);
      expect(useProjectScopeStore.getState().draft.members).toHaveLength(1);

      store.updateMemberRole('user-1', 'admin');
      expect(useProjectScopeStore.getState().draft.members[0]?.role).toBe(
        'admin',
      );

      store.removeMember('user-1');
      expect(useProjectScopeStore.getState().draft.members).toEqual([]);
    });
  });

  describe('status setters', () => {
    it('sets connectionReady, testStatus and fetchStatus', () => {
      const store = useProjectScopeStore.getState();
      store.setConnectionReady(true);
      store.setTestStatus('success');
      store.setFetchStatus('loading');

      const state = useProjectScopeStore.getState();
      expect(state.connectionReady).toBe(true);
      expect(state.testStatus).toBe('success');
      expect(state.fetchStatus).toBe('loading');
    });

    it('sets and clears error', () => {
      const store = useProjectScopeStore.getState();
      store.setError({ code: 'X', message: 'boom' });
      expect(useProjectScopeStore.getState().error).toEqual({
        code: 'X',
        message: 'boom',
      });

      store.clearError();
      expect(useProjectScopeStore.getState().error).toBeNull();
    });
  });

  describe('serializeProjectScopeDraft', () => {
    it('produces a snake_case payload', () => {
      const store = useProjectScopeStore.getState();
      store.initFromSeed({ companyId: 'co-1', name: 'P', description: 'd' });
      store.setSource('sap');
      store.setTarget('xero');
      store.updateConnection({ authType: 'bearer', skipSSL: true });
      store.setMasterData(['accounts']);
      store.setOpeningBalances(['balances']);
      store.addMember(member);

      const payload = serializeProjectScopeDraft(
        useProjectScopeStore.getState().draft,
      );

      expect(payload.company_id).toBe('co-1');
      expect(payload.source_erp).toBe('sap');
      expect(payload.target_erp).toBe('xero');
      expect(payload.source_method).toBe('mcp');
      expect(payload.target_method).toBe('mcp');
      expect(payload.connection.auth_type).toBe('bearer');
      expect(payload.connection.skip_ssl).toBe(true);
      expect(payload.scope.selected_master_data).toEqual(['accounts']);
      expect(payload.scope.selected_opening_balances).toEqual(['balances']);
      expect(payload.members[0]?.role).toBe('editor');
    });
  });

  describe('saveDraft', () => {
    it('returns ok and toggles isSavingDraft back to false on success', async () => {
      const result = await useProjectScopeStore
        .getState()
        .saveDraft(okClient);

      expect(result.ok).toBe(true);
      expect(useProjectScopeStore.getState().isSavingDraft).toBe(false);
      expect(useProjectScopeStore.getState().error).toBeNull();
    });

    it('returns err and sets error on failure', async () => {
      const result = await useProjectScopeStore
        .getState()
        .saveDraft(failingClient);

      expect(result.ok).toBe(false);
      expect(useProjectScopeStore.getState().isSavingDraft).toBe(false);
      expect(useProjectScopeStore.getState().error).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('restores defaults and yields a fresh draft object', () => {
      const store = useProjectScopeStore.getState();
      const draftBefore = store.draft;
      store.setSource('sap');
      store.addMember(member);

      store.reset();

      const state = useProjectScopeStore.getState();
      expect(state.draft.source).toBeNull();
      expect(state.draft.members).toEqual([]);
      expect(state.draft).not.toBe(draftBefore);
    });
  });
});
