import React from 'react';
import { View, Text } from 'react-native';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { MemberRow } from './MemberRow';

interface MembersTableProps {
  readonly members: readonly ProjectScopeMember[];
  readonly onUpdateRole: (id: string, role: ProjectPermission) => void;
  readonly onRemove: (id: string) => void;
  readonly testID?: string;
}

export function MembersTable({
  members,
  onUpdateRole,
  onRemove,
  testID,
}: MembersTableProps): React.JSX.Element {
  if (members.length === 0) {
    return (
      <View testID={testID}>
        <Text className="font-body text-sm text-muted-foreground">
          No members added yet.
        </Text>
      </View>
    );
  }

  const lastIndex = members.length - 1;

  return (
    <View
      className="overflow-hidden rounded-md border border-border"
      testID={testID}
    >
      <View
        className="flex-row items-center border-b border-border px-3 py-3"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        <Text className="w-[30%] font-body text-xs font-semibold uppercase text-muted-foreground">
          Member
        </Text>
        <Text className="w-[45%] text-center font-body text-xs font-semibold uppercase text-muted-foreground">
          Role
        </Text>
        <View className="w-[15%]" />
        <Text className="w-[10%] text-center font-body text-xs font-semibold uppercase text-muted-foreground">
          Actions
        </Text>
      </View>

      {members.map((member, index) => (
        <MemberRow
          key={member.id}
          member={member}
          onUpdateRole={onUpdateRole}
          onRemove={onRemove}
          isLast={index === lastIndex}
          testID={testID}
        />
      ))}
    </View>
  );
}
