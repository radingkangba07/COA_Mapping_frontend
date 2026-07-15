import { useCallback } from 'react';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { useProjectScopeStore } from '../store/project-scope.store';
import { selectMembers } from '../store/project-scope.selectors';

export interface AddMembersViewModel {
  readonly members: readonly ProjectScopeMember[];
  readonly memberCount: number;
  readonly addMember: (member: ProjectScopeMember) => void;
  readonly updateMemberRole: (id: string, role: ProjectPermission) => void;
  readonly removeMember: (id: string) => void;
}

export function useAddMembersViewModel(): AddMembersViewModel {
  const members = useProjectScopeStore(selectMembers);

  const addMember = useCallback((member: ProjectScopeMember): void => {
    useProjectScopeStore.getState().addMember(member);
  }, []);

  const updateMemberRole = useCallback(
    (id: string, role: ProjectPermission): void => {
      useProjectScopeStore.getState().updateMemberRole(id, role);
    },
    [],
  );

  const removeMember = useCallback((id: string): void => {
    useProjectScopeStore.getState().removeMember(id);
  }, []);

  return {
    members,
    memberCount: members.length,
    addMember,
    updateMemberRole,
    removeMember,
  };
}
