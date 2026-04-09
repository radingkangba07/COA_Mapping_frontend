import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { X, UserPlus } from 'lucide-react-native';
import type { ProjectId, UserId } from '@/shared/types/common.types';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { colors } from '@/config/theme';
import { useProjectAccess } from '../hooks/useProjectAccess';
import { MemberBadge } from './MemberBadge';
import { AddMemberDialog } from './AddMemberDialog';
import type { AccessResponse, ProjectPermission } from '../types/project-access.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_VARIANT = {
  viewer: 'secondary',
  editor: 'accent',
  approver: 'warning',
  admin: 'success',
} as const satisfies Record<ProjectPermission, 'secondary' | 'accent' | 'warning' | 'success'>;

const ROLE_LABEL: Record<ProjectPermission, string> = {
  viewer: 'Viewer',
  editor: 'Editor',
  approver: 'Approver',
  admin: 'Admin',
} as const;

// ─── Sub-components ─────────────────────────────────────────────────────────

interface RoleBadgeProps {
  permission: ProjectPermission;
  testID?: string;
}

const RoleBadge = ({ permission, testID }: RoleBadgeProps): React.JSX.Element => (
  <Badge variant={ROLE_VARIANT[permission]} testID={testID}>
    {ROLE_LABEL[permission]}
  </Badge>
);

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProjectMemberListProps {
  projectId: ProjectId;
  testID?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ProjectMemberList = ({
  projectId,
  testID = 'project-member-list',
}: ProjectMemberListProps): React.JSX.Element => {
  const {
    members,
    isLoading,
    canManage,
    currentUserId,
    revoke,
    isRevoking,
  } = useProjectAccess(projectId);

  const { confirm } = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRemove = useCallback(
    async (member: AccessResponse): Promise<void> => {
      const confirmed = await confirm({
        title: 'Remove Member',
        message: `Remove ${member.name} from this project?`,
        confirmText: 'Remove',
        cancelText: 'Cancel',
      });

      if (confirmed) {
        revoke(member.userId);
      }
    },
    [confirm, revoke],
  );

  const handleOpenDialog = (): void => setIsDialogOpen(true);
  const handleCloseDialog = (): void => setIsDialogOpen(false);

  const canRemoveMember = (userId: UserId): boolean =>
    canManage && userId !== currentUserId;

  return (
    <Card testID={testID}>
      <Card.Header className="flex-row items-center justify-between pb-4">
        <Card.Title>Members</Card.Title>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onPress={handleOpenDialog}
            testID={`${testID}-add-btn`}
          >
            <View className="flex-row items-center gap-1">
              <UserPlus size={14} color={colors.foreground} />
              <Text className="text-xs font-medium text-foreground">
                Add Member
              </Text>
            </View>
          </Button>
        )}
      </Card.Header>

      <Card.Content>
        {isLoading && (
          <Spinner className="py-8" testID={`${testID}-spinner`} />
        )}

        {!isLoading && members.length === 0 && (
          <EmptyState
            title="No members"
            description="This project has no members yet."
            testID={`${testID}-empty`}
          />
        )}

        {!isLoading && members.length > 0 && (
          <View className="gap-3" testID={`${testID}-rows`}>
            {members.map((member) => (
              <View
                key={member.userId}
                className="flex-row items-center gap-3"
                testID={`${testID}-row-${member.userId}`}
              >
                <MemberBadge
                  name={member.name}
                  size="md"
                  testID={`${testID}-avatar-${member.userId}`}
                />

                <View className="flex-1 min-w-0">
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

                <RoleBadge
                  permission={member.permission}
                  testID={`${testID}-role-${member.userId}`}
                />

                {canRemoveMember(member.userId) && (
                  <Pressable
                    onPress={() => void handleRemove(member)}
                    disabled={isRevoking}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                    testID={`${testID}-remove-${member.userId}`}
                  >
                    <X size={16} color={colors.destructive} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </Card.Content>

      <AddMemberDialog
        visible={isDialogOpen}
        onClose={handleCloseDialog}
        projectId={projectId}
        testID={`${testID}-add-dialog`}
      />
    </Card>
  );
};
