import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { Dialog } from '@/shared/components/ui/Dialog';
import { MemberBadge } from '../components/MemberBadge';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirm } from '@/shared/hooks/useConfirm';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { selectUser } from '@/features/auth/store/auth.selectors';
import { useMembersViewModel } from '../hooks/useMembersViewModel';
import { useOrgsViewModel } from '../hooks/useOrgsViewModel';
import { InviteMemberDialog } from '../components/InviteMemberDialog';
import { formatDate } from '@/shared/utils/date.utils';
import { colors } from '@/config/theme';
import type { OrgMember, OrgInvitation } from '../types/org.types';

// ─── Screen ───────────────────────────────────────────────────────────────

export const MembersScreen = (): React.JSX.Element => {
  const [inviteVisible, setInviteVisible] = useState(false);
  const {
    members, invitations, isOwner, isLoading, error,
    remove, cancelInvitation, isCancelling,
  } = useMembersViewModel();
  const { activeOrg, refetch } = useOrgsViewModel();
  const user = useAuthStore(selectUser);
  const { showError } = useToast();
  const { confirm, isVisible, confirmOptions, onConfirm, onCancel } = useConfirm();

  const handleInviteOpen = useCallback(() => setInviteVisible(true), []);
  const handleInviteClose = useCallback(() => setInviteVisible(false), []);

  const handleRemove = useCallback(
    async (member: OrgMember): Promise<void> => {
      const orgName = activeOrg?.name ?? 'this organization';
      const confirmed = await confirm({
        title: 'Remove Member',
        message: `Remove ${member.name} from ${orgName}? They will lose access immediately.`,
        confirmText: 'Remove',
        cancelText: 'Cancel',
      });
      if (!confirmed) return;

      const result = await remove(member.userId);
      if (!result.ok) showError(result.error.message);
    },
    [confirm, remove, activeOrg?.name, showError],
  );

  const handleCancelInvitation = useCallback(
    async (invitation: OrgInvitation): Promise<void> => {
      const result = await cancelInvitation(invitation.id);
      if (!result.ok) showError(result.error.message);
    },
    [cancelInvitation, showError],
  );

  if (error !== null && members.length === 0) {
    return (
      <Screen testID="members-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={refetch} />
      </Screen>
    );
  }

  const subtitle = `${activeOrg?.name ?? 'Organization'} · ${members.length} member${members.length === 1 ? '' : 's'}${invitations.length > 0 ? ` · ${invitations.length} pending` : ''}`;

  return (
    <Screen scroll testID="members-screen">
      {/* Header */}
      <View className="flex-row items-start justify-between pt-6 pb-2">
        <View className="flex-1">
          <Text className="font-heading text-2xl font-semibold text-foreground">
            Organization Members
          </Text>
          <Text className="mt-1 font-body text-sm text-muted-foreground">{subtitle}</Text>
        </View>
        {isOwner && (
          <Button size="sm" onPress={handleInviteOpen} testID="invite-member-btn">
            + Invite Member
          </Button>
        )}
      </View>

      <View className="my-4 h-px bg-border" />

      {/* Members section */}
      <Text className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Members
      </Text>

      {isLoading ? (
        <View className="gap-3 py-2">
          <Skeleton height={56} width="100%" />
          <Skeleton height={56} width="100%" />
          <Skeleton height={56} width="100%" />
        </View>
      ) : members.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Invite your first teammate."
          testID="members-empty"
        />
      ) : (
        <Card>
          {members.map((member, idx) => {
            const canRemove = isOwner && member.userId !== user?.userId;
            return (
              <View
                key={member.userId}
                className={`flex-row items-center px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
              >
                <MemberBadge name={member.name} size="md" />
                <View className="ml-3 flex-1">
                  <Text className="font-body text-sm font-medium text-foreground" numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text className="font-body text-xs text-muted-foreground" numberOfLines={1}>
                    {member.email}
                  </Text>
                </View>
                <Badge
                  variant={member.role === 'owner' ? 'default' : 'secondary'}
                  testID={`member-role-${member.userId}`}
                >
                  {member.role}
                </Badge>
                {canRemove ? (
                  <Pressable
                    onPress={() => void handleRemove(member)}
                    className="ml-3 items-center justify-center rounded p-1"
                    testID={`remove-member-${member.userId}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.name}`}
                  >
                    <X size={16} color={colors.destructive} />
                  </Pressable>
                ) : (
                  <View className="ml-3 w-6" />
                )}
              </View>
            );
          })}
        </Card>
      )}

      {/* Pending invitations section */}
      {isOwner && invitations.length > 0 && (
        <View className="mt-6">
          <Text className="mb-2 font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pending Invitations
          </Text>
          <Card>
            {invitations.map((inv, idx) => (
              <View
                key={inv.id}
                className={`flex-row items-center px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Text className="font-body text-sm text-muted-foreground">✉</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                    {inv.email}
                  </Text>
                  <Text className="font-body text-xs text-muted-foreground">
                    Invited {formatDate(inv.sentAt)}
                  </Text>
                </View>
                <Badge
                  variant={inv.role === 'owner' ? 'default' : 'secondary'}
                  testID={`invite-role-${inv.id}`}
                >
                  {inv.role}
                </Badge>
                <Pressable
                  onPress={() => void handleCancelInvitation(inv)}
                  disabled={isCancelling}
                  className="ml-3 items-center justify-center rounded px-2 py-1"
                  testID={`cancel-invite-${inv.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel invitation to ${inv.email}`}
                >
                  <Text className="font-body text-xs font-medium text-destructive">Cancel</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      )}

      <InviteMemberDialog
        visible={inviteVisible}
        onClose={handleInviteClose}
        testID="invite-dialog"
      />

      {isVisible && confirmOptions !== null && (
        <Dialog visible={isVisible} onClose={onCancel} testID="confirm-dialog">
          <Dialog.Header>
            <Dialog.Title>{confirmOptions.title}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Content>
            <Text className="font-body text-sm text-foreground">{confirmOptions.message}</Text>
          </Dialog.Content>
          <Dialog.Footer>
            <Button variant="outline" onPress={onCancel} testID="confirm-cancel-btn">
              {confirmOptions.cancelText ?? 'Cancel'}
            </Button>
            <Button variant="destructive" onPress={onConfirm} testID="confirm-ok-btn">
              {confirmOptions.confirmText ?? 'Confirm'}
            </Button>
          </Dialog.Footer>
        </Dialog>
      )}
    </Screen>
  );
};
