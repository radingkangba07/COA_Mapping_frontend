import React from 'react';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { ScopeSectionCard } from './ScopeSectionCard';
import { MemberAddControl } from './MemberAddControl';
import { MembersTable } from './MembersTable';

interface AddMembersSectionProps {
  readonly onAddMember: (member: ProjectScopeMember) => void;
  readonly members: readonly ProjectScopeMember[];
  readonly onUpdateMemberRole: (id: string, role: ProjectPermission) => void;
  readonly onRemoveMember: (id: string) => void;
  readonly testID?: string;
}

export function AddMembersSection({
  onAddMember,
  members,
  onUpdateMemberRole,
  onRemoveMember,
  testID,
}: AddMembersSectionProps): React.JSX.Element {
  return (
    <ScopeSectionCard
      title="Add Members"
      description="Add project members and assign their roles."
      testID={testID !== undefined ? `section-${testID}` : undefined}
      headerRight={
        <MemberAddControl
          onAdd={onAddMember}
          testID={testID !== undefined ? `${testID}-control` : undefined}
        />
      }
    >
      <MembersTable
        members={members}
        onUpdateRole={onUpdateMemberRole}
        onRemove={onRemoveMember}
        testID={testID !== undefined ? `${testID}-table` : undefined}
      />
    </ScopeSectionCard>
  );
}
