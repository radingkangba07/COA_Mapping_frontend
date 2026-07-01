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

// Mirrors RolePillSelector's role→colour mapping via shared Badge variants
// (viewer→secondary, editor→accent, approver→warning, admin→success) so the
// two controls stay visually in sync without duplicating colour classes.
type RoleBadgeVariant = 'secondary' | 'accent' | 'warning' | 'success';

const ROLE_BADGE_VARIANT: Record<ProjectPermission, RoleBadgeVariant> = {
  viewer: 'secondary',
  editor: 'accent',
  approver: 'warning',
  admin: 'success',
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
        'flex-row items-center gap-3 px-3 py-3',
        !isLast && 'border-b border-border',
      )}
      testID={testID !== undefined ? `${testID}-row-${member.id}` : undefined}
    >
      <Text
        className="flex-1 font-body text-sm font-medium text-foreground"
        numberOfLines={1}
      >
        {member.name}
      </Text>

      <View className="w-28 items-center">
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
          <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
            {memberRoleLabel(member.role)}
          </Badge>
        )}
      </View>

      <View className="w-36 flex-row items-center justify-end gap-1">
        <Pressable
          onPress={handleEditRole}
          accessibilityRole="button"
          accessibilityLabel={`Edit role for ${member.name}`}
          className="rounded-md px-2 py-1"
          testID={
            testID !== undefined
              ? `${testID}-edit-role-${member.id}`
              : undefined
          }
        >
          <Text className="font-body text-xs font-medium text-primary">
            Edit Role
          </Text>
        </Pressable>
        <Pressable
          onPress={handleRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${member.name}`}
          className="rounded-md p-1"
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
