import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ArrowRight, Briefcase } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { ERPBadge, getERPBadgeColor } from './ERPBadge';
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
    <View className="mb-3 flex-row items-center gap-2">
      <Briefcase size={18} color={colors.foreground} />
      <Text className="font-heading text-base font-semibold text-foreground">
        {projectName ?? 'Project Info'}
      </Text>
    </View>

    {currentUser ? (
      <View className="mb-3 rounded-lg bg-indigo-50 p-3">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
            <Text className="font-body text-sm font-bold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="font-body text-sm font-semibold text-indigo-900">
              {currentUser.name}
            </Text>
            <Text className="font-mono text-xs text-indigo-600">
              {currentUser.userId}
            </Text>
          </View>
        </View>
      </View>
    ) : null}

    {projectId ? (
      <View className="mb-3 rounded-lg bg-gray-50 p-3">
        <Text className="font-body mb-1 text-xs font-medium text-muted-foreground">
          Project ID
        </Text>
        <Text className="font-mono text-xs text-foreground">
          {projectId}
        </Text>
      </View>
    ) : null}

    {createdAt ? (
      <View className="mb-3 rounded-lg bg-gray-50 p-3">
        <Text className="font-body mb-1 text-xs font-medium text-muted-foreground">
          Created
        </Text>
        <Text className="font-body text-xs text-foreground">
          {formatDate(createdAt)}
          {createdByName ? ` by ${createdByName}` : ''}
        </Text>
      </View>
    ) : null}

    {updatedAt ? (
      <View className="mb-3 rounded-lg bg-amber-50 p-3">
        <Text className="font-body mb-1 text-xs font-medium text-amber-700">
          Last Edited
        </Text>
        <Text className="font-body text-xs text-amber-900">
          {formatDate(updatedAt)}
          {lastEditedBy ? ` by ${lastEditedBy}` : ''}
        </Text>
      </View>
    ) : null}

    <ERPBadge erp={sourceERP} label="Source ERP" className="mb-3 bg-blue-50/50" testID={`${testID}-source-erp`} />
    <ERPBadge erp={targetERP} label="Target ERP" className="mb-3 bg-green-50/50" testID={`${testID}-target-erp`} />

    {sourceERP && targetERP ? (
      <View className="rounded-lg border border-dashed border-border bg-gray-50 p-3">
        <Text className="font-body mb-2 text-xs font-medium text-muted-foreground">
          Migration Path
        </Text>
        <View className="flex-row items-center justify-center gap-2">
          <View className={`rounded-md px-2 py-1 ${getERPBadgeColor(sourceERP.id)}`}>
            <Text className="font-body text-xs font-bold text-white">
              {sourceERP.name}
            </Text>
          </View>
          <ArrowRight size={16} color={colors.mutedForeground} />
          <View className={`rounded-md px-2 py-1 ${getERPBadgeColor(targetERP.id)}`}>
            <Text className="font-body text-xs font-bold text-white">
              {targetERP.name}
            </Text>
          </View>
        </View>
      </View>
    ) : null}
  </ScrollView>
);
