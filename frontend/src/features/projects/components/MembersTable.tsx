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
        className="flex-row items-center border-b border-border px-1.5 py-1.5"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        {/* unlabelled number column */}
        <View className="w-[5%]" />
        <Text className="w-[25%] font-heading text-base font-semibold text-card-foreground">
          Member
        </Text>
        <Text className="w-[45%] text-center font-heading text-base font-semibold text-card-foreground">
          Role
        </Text>
        <Text className="w-[25%] text-center font-heading text-base font-semibold text-card-foreground">
          Actions
        </Text>
      </View>

      {members.map((member, index) => (
        <MemberRow
          key={member.id}
          member={member}
          position={index + 1}
          onUpdateRole={onUpdateRole}
          onRemove={onRemove}
          isLast={index === lastIndex}
          testID={testID}
        />
      ))}
    </View>
  );
}
