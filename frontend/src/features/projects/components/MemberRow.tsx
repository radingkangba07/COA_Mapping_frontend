import React, { useCallback, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { Badge } from '@/shared/components/ui/Badge';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { RolePillSelector } from './RolePillSelector';
import { SCOPE_MEMBER_ROLES, memberRoleLabel } from './MemberRoles.config';

const ROLE_BADGE_CLASS: Record<ProjectPermission, { className: string; textClassName: string }> = {
  admin:    { className: 'bg-[#E9EAF7]', textClassName: 'text-[#003399]' },
  editor:   { className: 'bg-[#E9EAF7]', textClassName: 'text-[#003399]' },
  approver: { className: 'bg-[#E9EAF7]', textClassName: 'text-[#003399]' },
  viewer:   { className: 'bg-[#E9EAF7]', textClassName: 'text-[#003399]' },
};

interface MemberRowProps {
  readonly member: ProjectScopeMember;
  readonly onUpdateRole: (id: string, role: ProjectPermission) => void;
  readonly onRemove: (id: string) => void;
  readonly isLast: boolean;
  readonly testID?: string;
}

export function MemberRow({
  member,
  onUpdateRole,
  onRemove,
  isLast,
  testID,
}: MemberRowProps): React.JSX.Element {
  const [isEditingRole, setIsEditingRole] = useState(false);

  const handleEditRole = useCallback((): void => setIsEditingRole(true), []);

  const handleRemove = useCallback(
    (): void => onRemove(member.id),
    [onRemove, member.id],
  );

  const handleRoleChange = useCallback(
    (next: ProjectPermission): void => {
      setIsEditingRole(false);
      onUpdateRole(member.id, next);
    },
    [onUpdateRole, member.id],
  );

  return (
    <View
      className={cn(
        'flex-row items-center px-1.5 py-1.5',
        !isLast && 'border-b border-border',
      )}
      testID={testID !== undefined ? `${testID}-row-${member.id}` : undefined}
    >
      <Text
        className="w-[30%] font-body text-sm font-medium text-foreground"
        numberOfLines={1}
      >
        {member.name}
      </Text>

      <View className="w-[45%] items-center">
        {isEditingRole ? (
          <RolePillSelector
            value={member.role}
            options={SCOPE_MEMBER_ROLES}
            onChange={handleRoleChange}
            testID={
              testID !== undefined ? `${testID}-role-${member.id}` : undefined
            }
          />
        ) : (
          <Badge
            variant="outline"
            className={cn('rounded-md border-0 px-2 py-1', ROLE_BADGE_CLASS[member.role].className)}
            textClassName={ROLE_BADGE_CLASS[member.role].textClassName}
          >
            {memberRoleLabel(member.role)}
          </Badge>
        )}
      </View>

      <View className="w-[15%] items-center">
        <Pressable
          onPress={handleEditRole}
          accessibilityRole="button"
          accessibilityLabel={`Edit role for ${member.name}`}
          className="rounded-md border border-[#003399] px-2 py-1"
          testID={
            testID !== undefined
              ? `${testID}-edit-role-${member.id}`
              : undefined
          }
        >
          <Text className="font-body text-xs font-medium text-[#003399]">
            Edit Role
          </Text>
        </Pressable>
      </View>

      <View className="w-[10%] items-center">
        <Pressable
          onPress={handleRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${member.name}`}
          className="rounded-md p-0.5"
          testID={
            testID !== undefined ? `${testID}-remove-${member.id}` : undefined
          }
        >
          <Trash2 size={16} color={colors.destructive} />
        </Pressable>
      </View>
    </View>
  );
}
