import React from 'react';
import { Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { getERPBadgeColor, getERPInitial } from '@/features/migration/components/ProjectSidebar/ERPBadge';
import type { ERPInfo } from './project-aside.types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ProjectMigrationDetailsProps {
  readonly projectId: string | null;
  readonly createdAt?: Date;
  readonly createdByName?: string;
  readonly updatedAt?: Date;
  readonly lastEditedBy?: string;
  readonly sourceERP: ERPInfo | null;
  readonly targetERP: ERPInfo | null;
  readonly sourceRowCount?: number;
  readonly targetRowCount?: number;
}

export function ProjectMigrationDetails({
  projectId,
  createdAt,
  createdByName,
  updatedAt,
  lastEditedBy,
  sourceERP,
  targetERP,
  sourceRowCount,
  targetRowCount,
}: ProjectMigrationDetailsProps): React.JSX.Element {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);

  return (
    <>
      {projectId ? (
        <View className="mt-[16px] flex-row items-baseline justify-between">
          <Text className="font-body text-[12px] text-muted-foreground">Project ID</Text>
          <Text className="font-mono text-[12px] text-foreground">{projectId.slice(0, 8)}</Text>
        </View>
      ) : null}

      {createdAt ? (
        <View className="mt-[18px]">
          <Text className="font-body text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
            Created at
          </Text>
          <Text className="mt-1 font-body text-[12.5px] text-foreground">
            {formatDate(createdAt)}{createdByName ? ` by ${createdByName}` : ''}
          </Text>
        </View>
      ) : null}

      {updatedAt ? (
        <View className="mt-[14px] border-b border-border pb-[18px]">
          <Text className="font-body text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
            Last edited
          </Text>
          <Text className="mt-1 font-body text-[12.5px] text-foreground">
            {formatDate(updatedAt)}{lastEditedBy ? ` by ${lastEditedBy}` : ''}
          </Text>
        </View>
      ) : null}

      {sourceERP && targetERP ? (
        <View className="mt-[18px]">
          <Text className="font-body text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
            Migration
          </Text>
          <View className="mt-3 flex-row items-start gap-[10px]">
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <View className={`h-[22px] w-[22px] items-center justify-center rounded-full ${getERPBadgeColor(sourceERP.id)}`}>
                  <Text className="font-body text-[9.5px] font-bold text-white">{getERPInitial(sourceERP.id)}</Text>
                </View>
                <Text className="min-w-0 flex-1 font-body text-[12.5px] font-medium text-foreground">{sourceERP.name}</Text>
              </View>
              <Text className="ml-8 mt-[7px] font-mono text-[11px] text-muted-foreground">
                {sourceRowCount ?? 0} source rows
              </Text>
            </View>
            <View className="w-6 items-center pt-1">
              <ArrowRight size={10} color={colors.mutedForeground} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <View className={`h-[22px] w-[22px] items-center justify-center rounded-full ${getERPBadgeColor(targetERP.id)}`}>
                  <Text className="font-body text-[9.5px] font-bold text-white">{getERPInitial(targetERP.id)}</Text>
                </View>
                <Text className="min-w-0 flex-1 font-body text-[12.5px] font-medium text-foreground">{targetERP.name}</Text>
              </View>
              <Text className="ml-8 mt-[7px] font-mono text-[11px] text-muted-foreground">
                {targetRowCount ?? 0} target rows
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}
