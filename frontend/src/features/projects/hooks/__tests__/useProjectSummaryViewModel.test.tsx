import { act, renderHook } from '@testing-library/react-native';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
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
    expect(result.current.summary.method).toBe('MCP');
    expect(result.current.summary.masterData).toBe('0 of 9 selected');
    expect(result.current.summary.openingBalances).toBe('0 of 5 selected');
    expect(result.current.summary.members).toBe('0');
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

  it('maps the csv method to its label', () => {
    const { result } = renderHook(() => useProjectSummaryViewModel());

    act(() => {
      useProjectScopeStore.getState().setMethod('csv');
    });

    expect(result.current.summary.method).toBe('CSV Upload');
  });

  it('falls back to the id string for an unknown ERP id', () => {
    const { result } = renderHook(() => useProjectSummaryViewModel());

    act(() => {
      useProjectScopeStore.getState().setSource('xero');
    });

    expect(result.current.summary.source).toBe('xero');
  });
});
