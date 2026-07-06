import { renderHook } from '@testing-library/react-native';
import { useOpenWorkstream } from '../hooks/useOpenWorkstream';
import type { Workstream } from '../types/workstream.types';

// ─── Mock React Navigation ───────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const includedWs: Workstream = {
  id: 'ws-1',
  name: 'Chart of Accounts',
  projectId: 'MD-001',
  status: 'in_progress',
  progress: 65,
  currentStage: 'Mapping',
  included: true,
};

const notIncludedWs: Workstream = {
  id: 'ws-2',
  name: 'Vehicles',
  projectId: 'MD-007',
  status: 'not_included',
  progress: 0,
  currentStage: 'Not Started',
  included: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useOpenWorkstream', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to WorkstreamDetail with correct params for an included workstream', () => {
    const { result } = renderHook(() => useOpenWorkstream('prj-123'));
    result.current(includedWs);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('WorkstreamDetail', {
      projectId: 'prj-123',
      workstreamId: 'ws-1',
      kind: 'MD-001',
    });
  });

  it('does NOT navigate for a not-included workstream', () => {
    const { result } = renderHook(() => useOpenWorkstream('prj-123'));
    result.current(notIncludedWs);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates correctly after re-render (callback remains functional)', () => {
    const { result, rerender } = renderHook(() => useOpenWorkstream('prj-123'));
    rerender({});
    result.current(includedWs);
    expect(mockNavigate).toHaveBeenCalledWith('WorkstreamDetail', {
      projectId: 'prj-123',
      workstreamId: 'ws-1',
      kind: 'MD-001',
    });
  });

  it('uses the projectId passed to the hook, not the workstream projectId', () => {
    const { result } = renderHook(() => useOpenWorkstream('different-project-id'));
    result.current(includedWs);
    expect(mockNavigate).toHaveBeenCalledWith('WorkstreamDetail', expect.objectContaining({
      projectId: 'different-project-id',
    }));
  });
});
