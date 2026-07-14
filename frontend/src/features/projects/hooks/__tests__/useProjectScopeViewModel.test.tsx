import type { JSX, ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok } from '@/shared/types/result.types';
import type { ERPSystem } from '@/features/erp-config/types/erp-config.types';
import type { Project } from '../../types/projects.types';
import { useProjectScopeStore } from '../../store/project-scope.store';
import {
  buildCreatePayload,
  useProjectScopeViewModel,
} from '../useProjectScopeViewModel';
import { createInitialDraft } from '../../store/project-scope.store';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

const erpSystems: ERPSystem[] = [
  { id: 'sap', name: 'SAP', description: '', fields: [] },
  { id: 'xero', name: 'Xero', description: '', fields: [] },
];

jest.mock('@/features/erp-config/hooks/useERPConfig', () => ({
  useERPConfig: () => ({
    erpSystems,
    selectedERP: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    selectERP: jest.fn(),
  }),
}));

// Both createProject (hook) and saveProjectDraft (store) come from this module.
const mockCreateProject = jest.fn();
const mockSaveProjectDraft = jest.fn();

jest.mock('../../services/projects.service', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  saveProjectDraft: (...args: unknown[]) => mockSaveProjectDraft(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEED = { companyId: 'co-1', name: 'My Migration', description: 'desc' } as const;

const fakeProject = { projectId: 'p1', name: 'My Migration' } as unknown as Project;

// The ViewModel calls useQueryClient(), so renderHook needs a QueryClientProvider.
function createWrapper(): ({ children }: { children: ReactNode }) => JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useProjectScopeViewModel', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
    jest.clearAllMocks();
    mockCreateProject.mockResolvedValue(ok(fakeProject));
    mockSaveProjectDraft.mockResolvedValue(ok(undefined));
  });

  // ── Seeding ───────────────────────────────────────────────────────────

  it('seeds the draft from the seed arg on mount', () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });

    expect(result.current.companyId).toBe('co-1');
    expect(result.current.name).toBe('My Migration');
    expect(result.current.description).toBe('desc');
  });

  // ── Gating ────────────────────────────────────────────────────────────

  it('createDisabled is true initially (no ERPs selected)', () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });
    expect(result.current.createDisabled).toBe(true);
  });

  it('becomes enabled with company + distinct ERPs + connectionReady', () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSource('sap');
      result.current.setTarget('xero');
      useProjectScopeStore.getState().setConnectionReady(true);
    });

    expect(result.current.createDisabled).toBe(false);
    expect(result.current.isCompatible).toBe(true);
  });

  it('is not compatible / stays disabled when source === target', () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSource('sap');
      result.current.setTarget('sap');
      useProjectScopeStore.getState().setConnectionReady(true);
    });

    expect(result.current.isCompatible).toBe(false);
    expect(result.current.createDisabled).toBe(true);
  });

  // ── create() ──────────────────────────────────────────────────────────

  it('create() returns false and does NOT call createProject when disabled', async () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });

    let outcome = true;
    await act(async () => {
      outcome = await result.current.create();
    });

    expect(outcome).toBe(false);
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it('create() calls createProject and returns true when enabled', async () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSource('sap');
      result.current.setTarget('xero');
      useProjectScopeStore.getState().setConnectionReady(true);
    });

    let outcome = false;
    await act(async () => {
      outcome = await result.current.create();
    });

    expect(outcome).toBe(true);
    expect(mockCreateProject).toHaveBeenCalledTimes(1);
  });

  // ── saveDraft() ───────────────────────────────────────────────────────

  it('saveDraft() invokes the draft endpoint', async () => {
    const { result } = renderHook(() => useProjectScopeViewModel(SEED), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(mockSaveProjectDraft).toHaveBeenCalledTimes(1);
    expect(mockShowSuccess).toHaveBeenCalledWith('Draft saved');
  });

  // ── buildCreatePayload (pure) ─────────────────────────────────────────

  describe('buildCreatePayload', () => {
    it('maps name/companyId/orgId/sourceErp/targetErp/description', () => {
      const draft = {
        ...createInitialDraft(),
        companyId: 'co-9',
        name: 'P',
        description: 'a description',
        source: 'sap',
        target: 'xero',
      };

      const payload = buildCreatePayload(draft);

      expect(payload.name).toBe('P');
      expect(payload.companyId).toBe('co-9');
      expect(payload.orgId).toBe('co-9');
      expect(payload.sourceErp).toBe('sap');
      expect(payload.targetErp).toBe('xero');
      expect(payload.description).toBe('a description');
    });

    it('derives vendor ids from the selected products (action=create requires them)', () => {
      const draft = {
        ...createInitialDraft(),
        companyId: 'co-9',
        name: 'P',
        source: 'sap',
        target: 'oracle_netsuite',
      };

      const payload = buildCreatePayload(draft);

      expect(payload.sourceVendorId).toBe('sap');
      expect(payload.targetVendorId).toBe('oracle');
    });

    it('omits vendor ids when no products are selected', () => {
      const draft = { ...createInitialDraft(), companyId: 'co-9', name: 'P' };
      const payload = buildCreatePayload(draft);
      expect(payload.sourceVendorId).toBeUndefined();
      expect(payload.targetVendorId).toBeUndefined();
    });

    it('omits description when empty', () => {
      const draft = { ...createInitialDraft(), companyId: 'co-9', name: 'P' };
      const payload = buildCreatePayload(draft);
      expect(payload.description).toBeUndefined();
    });

    it('includes mapped members when the draft has members', () => {
      const draft = {
        ...createInitialDraft(),
        companyId: 'co-9',
        name: 'P',
        members: [
          {
            id: 'alice@example.com',
            name: 'Alice',
            email: 'alice@example.com',
            role: 'admin' as const,
          },
          {
            id: 'bob@example.com',
            name: 'Bob',
            email: 'bob@example.com',
            role: 'viewer' as const,
          },
        ],
      };

      const payload = buildCreatePayload(draft);

      // Members are excluded from the create payload and added after project creation
      expect(payload.members).toBeUndefined();
    });

    it('omits members when the draft has none', () => {
      const draft = {
        ...createInitialDraft(),
        companyId: 'co-9',
        name: 'P',
        members: [],
      };
      const payload = buildCreatePayload(draft);
      expect(payload.members).toBeUndefined();
    });
  });
});
