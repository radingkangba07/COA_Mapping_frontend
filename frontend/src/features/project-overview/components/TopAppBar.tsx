import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, Share2, MoreHorizontal } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { StatusBadge } from '@/features/projects/components/StatusBadge';
import type { ProjectStatus } from '@/features/projects/types/projects.types';

interface TopAppBarProps {
  readonly breadcrumb: readonly [string, string];
  readonly status: ProjectStatus;
  readonly sourceErp: string;
  readonly targetErp: string;
  readonly projectId: string;
  readonly onBack?: () => void;
  readonly onShare?: () => void;
  readonly onActionsPress?: () => void;
  readonly testID?: string;
}

export const TopAppBar = ({
  breadcrumb,
  status,
  sourceErp,
  targetErp,
  projectId,
  onBack,
  onShare,
  onActionsPress,
  testID,
}: TopAppBarProps): React.JSX.Element => {
  const [parentLabel, currentLabel] = breadcrumb;

  return (
    <View
      className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background"
      testID={testID}
    >
      {/* Left: breadcrumb + project metadata */}
      <View className="flex-1 flex-col gap-1">
        <View className="flex-row items-center gap-1">
          <Pressable onPress={onBack} testID="topbar-back">
            <Text className="font-body text-sm text-muted-foreground">
              {parentLabel}
            </Text>
          </Pressable>
          <ChevronRight size={14} color={colors.mutedForeground} />
          <Text
            className="font-body text-sm font-semibold text-foreground"
            numberOfLines={1}
          >
            {currentLabel}
          </Text>
        </View>

        <View className="flex-row items-center gap-3 flex-wrap">
          <StatusBadge status={status} />
          <Text className="font-body text-xs text-muted-foreground">
            {sourceErp} → {targetErp}
          </Text>
          <Text className="font-mono text-xs text-muted-foreground">
            Project ID: {projectId}
          </Text>
        </View>
      </View>

      {/* Right: action buttons */}
      <View className="flex-row items-center gap-2 ml-4">
        <Pressable
          onPress={onShare}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background"
          testID="topbar-share-btn"
        >
          <Share2 size={14} color={colors.foreground} />
          <Text className="font-body text-xs font-medium text-foreground">
            Share
          </Text>
        </Pressable>
        <Pressable
          onPress={onActionsPress}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary"
          testID="topbar-actions-btn"
        >
          <Text className="font-body text-xs font-medium text-primary-foreground">
            Actions
          </Text>
          <MoreHorizontal size={14} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
};
