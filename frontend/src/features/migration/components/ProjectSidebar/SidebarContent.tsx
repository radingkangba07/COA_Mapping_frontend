import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ClipboardList, Pencil } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { ERPBadge } from './ERPBadge';
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

export const SidebarContent = ({
  projectId,
  projectName,
  createdAt,
  createdByName,
  updatedAt,
  lastEditedBy,
  sourceERP,
  targetERP,
  currentUser,
  testID,
}: SidebarContentProps) => (
  <ScrollView className="flex-1 px-3 pb-4 pt-2" testID={testID}>
    <View className="mb-3 flex-row items-center gap-2 border-b border-border pb-3">
      <ClipboardList size={18} color={colors.foreground} />
      <Text className="font-heading flex-1 text-base font-semibold text-foreground">
        {projectName ?? 'Project Info'}
      </Text>
      <Pencil size={16} color={colors.mutedForeground} />
    </View>

    {currentUser ? (
      <View className="mb-3 border-b border-border pb-3">
        <Text className="mb-2 font-body text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          CURRENT USER
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
            <Text className="font-body text-sm font-bold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="font-body text-sm font-semibold text-indigo-900 dark:text-indigo-300">
              {currentUser.name}
            </Text>
            <Text className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
              {currentUser.userId}
            </Text>
          </View>
        </View>
      </View>
    ) : null}

    {projectId ? (
      <View className="mb-3">
        <Text className="mb-1 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          PROJECT ID
        </Text>
        <Text className="font-mono text-sm font-bold text-foreground">
          {projectId}
        </Text>
      </View>
    ) : null}

    {createdAt ? (
      <View className="mb-3 border-b border-border pb-3">
        <Text className="mb-1 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          CREATED AT
        </Text>
        <Text className="font-body text-xs text-foreground">
          {formatDate(createdAt)}
          {createdByName ? ` by ${createdByName}` : ''}
        </Text>
      </View>
    ) : null}

    {updatedAt ? (
      <View className="mb-3 rounded-lg border border-dashed border-border bg-gray-50 dark:bg-[#2D2D2D] p-3">
        <Text className="mb-1 font-body text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          LAST EDITED
        </Text>
        <Text className="font-body text-xs text-foreground">
          {formatDate(updatedAt)}
          {lastEditedBy ? ` by ${lastEditedBy}` : ''}
        </Text>
      </View>
    ) : null}

    <ERPBadge erp={sourceERP} label="Source ERP" className="mb-3 bg-gray-50 dark:bg-[#2D2D2D] border border-dashed border-border" labelClassName="text-blue-600 dark:text-blue-400" testID={`${testID}-source-erp`} />
    <ERPBadge erp={targetERP} label="Target ERP" className="mb-3 bg-gray-50 dark:bg-[#2D2D2D] border border-dashed border-border" labelClassName="text-green-600 dark:text-green-400" testID={`${testID}-target-erp`} />

    {sourceERP && targetERP ? (
      <View className="rounded-lg border border-dashed border-border bg-gray-50 dark:bg-[#2D2D2D] p-3">
        <Text className="mb-2 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          MIGRATION PATH
        </Text>
        <Text className="text-center font-body text-sm text-foreground">
          {sourceERP.name}  →  {targetERP.name}
        </Text>
      </View>
    ) : null}
  </ScrollView>
);
