import { act, renderHook } from '@testing-library/react-native';
import { useAddMembersViewModel } from '@/features/projects/hooks/useAddMembersViewModel';
import {
  INITIAL_MEMBERS,
  useProjectScopeStore,
} from '@/features/projects/store/project-scope.store';
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

  it('starts with the default members', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    expect(result.current.members).toEqual(INITIAL_MEMBERS);
    expect(result.current.memberCount).toBe(INITIAL_MEMBERS.length);
  });

  it('addMember appends to members, bumps memberCount and reflects the real draft store', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
    });

    expect(result.current.members).toHaveLength(INITIAL_MEMBERS.length + 1);
    expect(result.current.members.find((m) => m.id === alice.id)).toEqual(alice);
    expect(result.current.memberCount).toBe(INITIAL_MEMBERS.length + 1);
    expect(useProjectScopeStore.getState().draft.members).toContainEqual(alice);
  });

  it('addMember supports multiple members in insertion order', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
      result.current.addMember(bob);
    });

    expect(result.current.memberCount).toBe(INITIAL_MEMBERS.length + 2);
    expect(result.current.members.map((m) => m.id)).toEqual([
      ...INITIAL_MEMBERS.map((m) => m.id),
      alice.id,
      bob.id,
    ]);
  });

  it('updateMemberRole changes the stored member role', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
    });
    act(() => {
      result.current.updateMemberRole(alice.id, 'admin');
    });

    expect(result.current.members.find((m) => m.id === alice.id)?.role).toBe(
      'admin',
    );
    expect(
      useProjectScopeStore
        .getState()
        .draft.members.find((m) => m.id === alice.id)?.role,
    ).toBe('admin');
  });

  it('removeMember removes by id, returning to just the default members', () => {
    const { result } = renderHook(() => useAddMembersViewModel());

    act(() => {
      result.current.addMember(alice);
      result.current.addMember(bob);
    });
    act(() => {
      result.current.removeMember(alice.id);
    });

    expect(result.current.members.map((m) => m.id)).toEqual([
      ...INITIAL_MEMBERS.map((m) => m.id),
      bob.id,
    ]);
    expect(result.current.memberCount).toBe(INITIAL_MEMBERS.length + 1);

    act(() => {
      result.current.removeMember(bob.id);
    });

    expect(result.current.members).toEqual(INITIAL_MEMBERS);
    expect(result.current.memberCount).toBe(INITIAL_MEMBERS.length);
    expect(useProjectScopeStore.getState().draft.members).toEqual(
      INITIAL_MEMBERS,
    );
  });
});
