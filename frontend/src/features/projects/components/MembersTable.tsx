import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors } from '@/config/theme';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { MemberBadge } from './MemberBadge';
import { RolePillSelector } from './RolePillSelector';
import { SCOPE_MEMBER_ROLES } from './MemberRoles.config';

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

  return (
    <View className="gap-2" testID={testID}>
      <View
        className="flex-row items-center gap-3 px-1 pb-1"
        testID={testID !== undefined ? `${testID}-header` : undefined}
      >
        <Text className="flex-1 font-body text-xs font-semibold uppercase text-muted-foreground">
          Member
        </Text>
        <Text className="w-24 font-body text-xs font-semibold uppercase text-muted-foreground">
          Role
        </Text>
        <Text className="w-12 text-right font-body text-xs font-semibold uppercase text-muted-foreground">
          Actions
        </Text>
      </View>

      {members.map((member) => (
        <View
          key={member.id}
          className="flex-row items-center gap-3 rounded-md border border-border px-3 py-2"
          testID={testID !== undefined ? `${testID}-row-${member.id}` : undefined}
        >
          <View className="flex-1 flex-row items-center gap-2">
            <MemberBadge name={member.name} size="sm" />
            <View className="flex-1">
              <Text
                className="font-body text-sm font-medium text-foreground"
                numberOfLines={1}
              >
                {member.name}
              </Text>
              <Text
                className="font-body text-xs text-muted-foreground"
                numberOfLines={1}
              >
                {member.email}
              </Text>
            </View>
          </View>

          <View className="w-24">
            <RolePillSelector
              value={member.role}
              options={SCOPE_MEMBER_ROLES}
              onChange={(next) => onUpdateRole(member.id, next)}
              testID={
                testID !== undefined ? `${testID}-role-${member.id}` : undefined
              }
            />
          </View>

          <View className="w-12 items-end">
            <Pressable
              onPress={() => onRemove(member.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${member.name}`}
              className="rounded-md p-1"
              testID={
                testID !== undefined
                  ? `${testID}-remove-${member.id}`
                  : undefined
              }
            >
              <Trash2 size={16} color={colors.destructive} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
