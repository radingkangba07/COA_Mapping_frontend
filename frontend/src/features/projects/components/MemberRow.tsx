import React, { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { Edit3, Trash2 } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import type { ProjectPermission } from '../types/project-access.types';
import type { ProjectScopeMember } from '../types/project-scope.types';
import { RolePillSelector } from './RolePillSelector';
import { SCOPE_MEMBER_ROLES, memberRoleLabel } from './MemberRoles.config';

// Same pill treatment as the mapping table's "AI suggestion" badge
// (AccountTypeGroup), applied to every role value.
const ROLE_PILL_CLASS =
  'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';

interface MemberRowProps {
  readonly member: ProjectScopeMember;
  /** 1-based position shown in the unlabelled number column. */
  readonly position: number;
  readonly onUpdateRole: (id: string, role: ProjectPermission) => void;
  readonly onRemove: (id: string) => void;
  readonly isLast: boolean;
  readonly testID?: string;
}

export function MemberRow({
  member,
  position,
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
      <View className="w-[5%] items-center">
        <View className="h-6 w-6 items-center justify-center rounded-full border border-border bg-muted">
          <Text className="font-body text-xs font-medium text-muted-foreground">
            {position}
          </Text>
        </View>
      </View>
      <Text
        className="w-[25%] font-body text-sm font-medium text-foreground"
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
            className={cn('px-1.5 py-0.5', ROLE_PILL_CLASS)}
            textClassName={cn('text-xs', ROLE_PILL_CLASS)}
          >
            {memberRoleLabel(member.role)}
          </Badge>
        )}
      </View>

      {/* Combined actions column — edit + remove grouped around the center. */}
      <View className="w-[25%] flex-row items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onPress={handleEditRole}
          accessibilityLabel={`Edit role for ${member.name}`}
          testID={
            testID !== undefined
              ? `${testID}-edit-role-${member.id}`
              : undefined
          }
        >
          <View className="flex-row items-center gap-1.5">
            <Edit3 size={14} color={colors.foreground} />
            <Text className="text-xs font-medium text-foreground">Edit</Text>
          </View>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={handleRemove}
          className="h-7 px-2 border-red-200 dark:border-red-800"
          accessibilityLabel={`Remove ${member.name}`}
          testID={
            testID !== undefined ? `${testID}-remove-${member.id}` : undefined
          }
        >
          <Trash2 size={12} color={colors.destructive} />
        </Button>
      </View>
    </View>
  );
}
