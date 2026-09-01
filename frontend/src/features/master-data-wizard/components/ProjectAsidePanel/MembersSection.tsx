import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronRight, Users } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { createOrgId, createProjectId } from '@/shared/types/common.types';
import { Button } from '@/shared/components/ui/Button';
import { AddMemberDialog } from '@/features/projects/components/AddMemberDialog';
import { MemberBadge } from '@/features/projects/components/MemberBadge';
import { useProjectAccess } from '@/features/projects/hooks/useProjectAccess';

interface MembersSectionProps {
  readonly projectId: string | null;
  readonly orgId?: string;
  readonly testID?: string;
}

export function MembersSection({ projectId, orgId, testID }: MembersSectionProps): React.JSX.Element | null {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const brandedId = projectId !== null ? createProjectId(projectId) : null;
  const { canManage, members, isLoading } = useProjectAccess(brandedId);

  if (brandedId === null) return null;

  return (
    <View testID={testID}>
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          onPress={() => setIsInviteOpen(true)}
          testID={testID ? `${testID}-invite-btn` : undefined}
        >
          <View className="flex-row items-center justify-center gap-[7px]">
            <Users size={14} color={colors.foreground} />
            <Text className="text-[12.5px] font-semibold text-foreground">Members</Text>
          </View>
        </Button>
      )}

      <Pressable
        onPress={() => setIsExpanded((value) => !value)}
        className="mt-[22px] flex-row items-center justify-between"
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Collapse members' : 'Expand members'}
        testID={testID ? `${testID}-toggle` : undefined}
      >
        <View className="flex-row items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown size={12} color={colors.mutedForeground} />
          ) : (
            <ChevronRight size={12} color={colors.mutedForeground} />
          )}
          <Text className="font-body text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
            Members
          </Text>
        </View>
        <Text className="font-mono text-[11.5px] text-muted-foreground">{members.length}</Text>
      </Pressable>

      {isExpanded && (
        isLoading ? (
          <Text className="mt-3 font-body text-xs text-muted-foreground">Loading members...</Text>
        ) : members.length === 0 ? (
          <Text className="mt-3 font-body text-xs text-muted-foreground">No members yet</Text>
        ) : (
          <View>
            {members.map((member) => (
              <View key={member.userId} className="mt-3 flex-row items-center gap-[9px]">
                <MemberBadge name={member.name || member.email} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text className="font-body text-[12.5px] font-semibold text-foreground" numberOfLines={1}>
                    {member.name || member.email}
                  </Text>
                  <Text className="font-body text-[11px] text-muted-foreground" numberOfLines={1}>
                    {member.permission}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )
      )}

      <AddMemberDialog
        visible={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        projectId={brandedId}
        orgId={orgId !== undefined ? createOrgId(orgId) : undefined}
        testID={testID ? `${testID}-add-member-dialog` : undefined}
      />
    </View>
  );
}
