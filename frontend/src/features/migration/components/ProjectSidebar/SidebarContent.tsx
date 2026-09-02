import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, Pencil, Users } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { createOrgId, createProjectId } from '@/shared/types/common.types';
import { Button } from '@/shared/components/ui/Button';
import { AddMemberDialog } from '@/features/projects/components/AddMemberDialog';
import { useProjectAccess } from '@/features/projects/hooks/useProjectAccess';
import { MemberBadge } from '@/features/projects/components/MemberBadge';
import { getERPBadgeColor, getERPInitial } from './ERPBadge';
import type { SidebarContentProps } from './sidebar.types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between py-1.5">
      <Text className="font-body text-xs text-muted-foreground">{label}</Text>
      <Text className="font-body text-xs text-foreground">{value}</Text>
    </View>
  );
}

export function SidebarContent({
  projectId,
  displayCode,
  orgId,
  projectName,
  createdAt,
  createdByName,
  updatedAt,
  lastEditedBy,
  sourceERP,
  targetERP,
  sourceRowCount,
  targetRowCount,
  currentUser,
  onToggle,
  testID,
}: SidebarContentProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isMembersExpanded, setIsMembersExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const brandedId = projectId !== null ? createProjectId(projectId) : null;
  const { canManage, members, isLoading: membersLoading } = useProjectAccess(brandedId);
  const visibleMembers = members.slice(0, 15);
  const remainingMembers = Math.max(0, members.length - visibleMembers.length);

  const handleToggleCollapse = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setIsCollapsed((prev) => !prev);
  };

  if (isCollapsed) {
    return (
     <View
  className="h-full w-14 items-center border-r border-border bg-card py-4"
  testID={testID}
>
  <Pressable
    onPress={handleToggleCollapse}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel="Show project details"
    testID="sidebar-content-collapse-toggle"
    className="mb-2 rounded-lg p-2 hover:bg-gray-200"
  >
    <ChevronsRight size={18} color={colors.mutedForeground} />
  </Pressable>

  <View
    className="mt-14"
    style={{ width: 'auto', height: 'auto'}}
  >
    <Text
      className="font-heading my-5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
      numberOfLines={1}
      ellipsizeMode="tail"
      style={{
        transform: [{ rotate: "90deg" }],
        width: 'auto',
        textAlign: "center",
      }}
    >
      {(projectName ?? "Project") + " · Project"}
    </Text>
  </View>
</View>
    );
  }

  return (
    <View className="h-full w-64 border-r border-border bg-card" testID={testID}>
      <ScrollView className="flex-1 px-4 pb-4 pt-3">
        {/* Project title */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">

            <ClipboardList size={16} color={colors.foreground} />
            <Text className="font-heading flex-1 text-sm font-semibold text-foreground" numberOfLines={2}>
              {projectName ?? 'Project Info'}
            </Text>
            <Pencil size={14} color={colors.mutedForeground} />
          </View>
          <Pressable
            onPress={handleToggleCollapse}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Hide project details"
            testID="sidebar-content-collapse-toggle"
            className="rounded-md p-2 hover:bg-gray-200"
          >
            <ChevronsLeft size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* User */}
        {currentUser ? (
          <View className="flex-row items-center gap-2 mb-4">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
              <Text className="font-body text-xs font-bold text-white">
                {currentUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="font-body text-sm font-medium text-foreground">
              {currentUser.name}
            </Text>
          </View>
        ) : null}

        {/* Invite Member */}
        {brandedId !== null && canManage && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => setIsInviteOpen(true)}
            className="mb-4"
            testID="sidebar-invite-btn"
          >
            <View className="flex-row items-center justify-center gap-1.5">
              <Users size={14} color={colors.foreground} />
              <Text className="text-xs font-medium text-foreground">Members</Text>
            </View>
          </Button>
        )}

        {brandedId !== null && (
          <View className="mb-4 gap-2" testID="sidebar-members-list">
            <Pressable
              onPress={() => setIsMembersExpanded((value) => !value)}
              className="flex-row items-center justify-between"
              accessibilityRole="button"
              accessibilityLabel={isMembersExpanded ? 'Collapse members' : 'Expand members'}
              testID="sidebar-members-toggle"
            >
              <View className="flex-row items-center gap-1">
                {isMembersExpanded ? (
                  <ChevronDown size={12} color={colors.mutedForeground} />
                ) : (
                  <ChevronRight size={12} color={colors.mutedForeground} />
                )}
                <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Members
                </Text>
              </View>
              <Text className="font-body text-[10px] text-muted-foreground">
                {members.length}
              </Text>
            </Pressable>

            {isMembersExpanded && membersLoading ? (
              <Text className="font-body text-xs text-muted-foreground">Loading members...</Text>
            ) : isMembersExpanded && visibleMembers.length === 0 ? (
              <Text className="font-body text-xs text-muted-foreground">No members yet</Text>
            ) : isMembersExpanded ? (
              <View className="gap-2">
                {visibleMembers.map((member) => (
                  <View
                    key={member.userId}
                    className="flex-row items-center gap-2"
                    testID={`sidebar-member-${member.userId}`}
                  >
                    <MemberBadge name={member.name || member.email} size="sm" />
                    <View className="min-w-0 flex-1">
                      <Text className="font-body text-xs font-medium text-foreground" numberOfLines={1}>
                        {member.name || member.email}
                      </Text>
                      <Text className="font-body text-[10px] text-muted-foreground" numberOfLines={1}>
                        {member.permission}
                      </Text>
                    </View>
                  </View>
                ))}
                {remainingMembers > 0 && (
                  <Text className="font-body text-xs text-muted-foreground">
                    +{remainingMembers} more
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        )}

        {/* Details */}
        <View className="border-t border-border pt-3 mb-4">
          {projectId ? (
            <SidebarRow label="Project ID" value={projectId!.slice(0, 8)} />
          ) : null}
          {createdAt ? (
            <View className="py-1.5">
              <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Created at</Text>
              <Text className="font-body text-xs text-foreground mt-0.5">
                {formatDate(createdAt)}{createdByName ? ` by ${createdByName}` : ''}
              </Text>
            </View>
          ) : null}
          {updatedAt ? (
            <View className="py-1.5">
              <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Last edited</Text>
              <Text className="font-body text-xs text-foreground mt-0.5">
                {formatDate(updatedAt)}{lastEditedBy ? ` by ${lastEditedBy}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Migration path */}
        {sourceERP && targetERP ? (
          <View className="border-t border-border pt-3">
            <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Migration
            </Text>
            <View className="flex-row items-start">
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <View className={`h-6 w-6 items-center justify-center rounded-full ${getERPBadgeColor(sourceERP.id)}`}>
                    <Text className="font-body text-[10px] font-bold text-white">{getERPInitial(sourceERP.id)}</Text>
                  </View>
                  <Text className="min-w-0 flex-1 font-body text-xs font-medium text-foreground">{sourceERP.name}</Text>
                </View>
                <Text className="ml-8 mt-1 font-mono text-[10px] text-muted-foreground">
                  {sourceRowCount ?? 0} source rows
                </Text>
              </View>
              <View className="w-6 items-center pt-2">
                <ArrowRight size={10} color={colors.mutedForeground} />
              </View>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <View className={`h-6 w-6 items-center justify-center rounded-full ${getERPBadgeColor(targetERP.id)}`}>
                    <Text className="font-body text-[10px] font-bold text-white">{getERPInitial(targetERP.id)}</Text>
                  </View>
                  <Text className="min-w-0 flex-1 font-body text-xs font-medium text-foreground">{targetERP.name}</Text>
                </View>
                <Text className="ml-8 mt-1 font-mono text-[10px] text-muted-foreground">
                  {targetRowCount ?? 0} target rows
                </Text>
              </View>
            </View>
          </View>
        ) : sourceERP ? (
          <View className="border-t border-border pt-3">
            <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Source ERP
            </Text>
            <View className="flex-row items-center gap-2">
              <View className={`h-6 w-6 items-center justify-center rounded-full ${getERPBadgeColor(sourceERP.id)}`}>
                <Text className="font-body text-[10px] font-bold text-white">{getERPInitial(sourceERP.id)}</Text>
              </View>
              <Text className="font-body text-xs font-medium text-foreground">{sourceERP.name}</Text>
            </View>
          </View>
        ) : null}

        {/* Add Member Dialog */}
        {brandedId !== null && (
          <AddMemberDialog
            visible={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
            projectId={brandedId}
            orgId={orgId !== undefined ? createOrgId(orgId) : undefined}
            testID="sidebar-add-member-dialog"
          />
        )}
      </ScrollView>
    </View>
  );
}
