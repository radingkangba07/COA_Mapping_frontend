import { act, renderHook } from '@testing-library/react-native';
import { useAddMembersViewModel } from '@/features/projects/hooks/useAddMembersViewModel';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import type { ProjectScopeMember } from '@/features/projects/types/project-scope.types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const alice: ProjectScopeMember = {
  id: 'alice@example.com',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'editor',
};

const bob: ProjectScopeMember = {
  id: 'bob@example.com',
  name: 'Bob',
  email: 'bob@example.com',
  role: 'viewer',
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useAddMembersViewModel', () => {
  beforeEach(() => {
    useProjectScopeStore.getState().reset();
  });

  it('starts with no members', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    expect(result.current.members).toEqual([]);
    expect(result.current.memberCount).toBe(0);
  });

  it('addMember appends to members, bumps memberCount and reflects the real draft store', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
    });

    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0]).toEqual(alice);
    expect(result.current.memberCount).toBe(1);
    expect(useProjectScopeStore.getState().draft.members).toContainEqual(alice);
  });

  it('addMember supports multiple members in insertion order', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
      result.current.addMember(bob);
    });

    expect(result.current.memberCount).toBe(2);
    expect(result.current.members.map((m) => m.id)).toEqual([alice.id, bob.id]);
  });

  it('updateMemberRole changes the stored member role', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
    });
    act(() => {
      result.current.updateMemberRole(alice.id, 'admin');
    });

    expect(result.current.members[0]?.role).toBe('admin');
    expect(useProjectScopeStore.getState().draft.members[0]?.role).toBe('admin');
  });

  it('removeMember removes by id, returning to an empty list with zero count', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
      result.current.addMember(bob);
    });
    act(() => {
      result.current.removeMember(alice.id);
    });

    expect(result.current.members.map((m) => m.id)).toEqual([bob.id]);
    expect(result.current.memberCount).toBe(1);

    act(() => {
      result.current.removeMember(bob.id);
    });

    expect(result.current.members).toEqual([]);
    expect(result.current.memberCount).toBe(0);
    expect(useProjectScopeStore.getState().draft.members).toEqual([]);
  });
});
