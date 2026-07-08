import { act, renderHook } from '@testing-library/react-native';
import {
  INITIAL_MEMBERS,
  useProjectScopeStore,
} from '@/features/projects/store/project-scope.store';
import { useProjectSummaryViewModel } from '../useProjectSummaryViewModel';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/features/erp-config/hooks/useERPConfig', () => ({
  useERPConfig: () => ({
    erpSystems: [
      { id: 'sap', name: 'SAP' },
      { id: 'netsuite', name: 'Oracle NetSuite' },
    ],
    isLoading: false,
  }),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useProjectSummaryViewModel', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('renders default display values from the initial draft', () => {
    const { result } = renderHook(() => useProjectSummaryViewModel());

    expect(result.current.summary.source).toBeNull();
    expect(result.current.summary.target).toBeNull();
    expect(result.current.summary.connectionMethod).toBe('CSV File Upload');
    expect(result.current.summary.masterData).toBe('0 of 9 selected');
    expect(result.current.summary.openingBalances).toBe('0 of 5 selected');
    expect(result.current.summary.members).toBe(String(INITIAL_MEMBERS.length));
  });

  it('resolves known ERP ids to their labels', () => {
    const { result } = renderHook(() => useProjectSummaryViewModel());

    act(() => {
      useProjectScopeStore.getState().setSource('sap');
      useProjectScopeStore.getState().setTarget('netsuite');
    });

    expect(result.current.summary.source).toBe('SAP');
    expect(result.current.summary.target).toBe('Oracle NetSuite');
  });

  it('maps per-side methods to a combined label when they differ', () => {
    const { result } = renderHook(() => useProjectSummaryViewModel());

    act(() => {
      useProjectScopeStore.getState().setSourceMethod('mcp');
    });

    expect(result.current.summary.connectionMethod).toBe(
      'Source: MCP Server / Target: CSV File Upload',
    );
  });

  it('falls back to the id string for an unknown ERP id', () => {
    const { result } = renderHook(() => useProjectSummaryViewModel());

    act(() => {
      useProjectScopeStore.getState().setSource('xero');
    });

    expect(result.current.summary.source).toBe('xero');
  });
});
