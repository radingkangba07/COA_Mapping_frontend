import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, Share2, ChevronDown } from 'lucide-react-native';
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
      className="border-b border-border bg-background"
      testID={testID}
    >
      {/* Breadcrumb strip */}
      <View
        className="flex-row items-center border-b border-border px-6"
        style={{ height: 36 }}
        testID="topbar-breadcrumb"
      >
        <Pressable onPress={onBack} testID="topbar-back">
          <Text className="font-body text-xs text-muted-foreground">
            {parentLabel}
          </Text>
        </Pressable>
        <ChevronRight size={12} color={colors.mutedForeground} style={{ marginHorizontal: 4 }} />
        <Text className="font-body text-xs text-foreground font-medium" numberOfLines={1}>
          {currentLabel}
        </Text>
      </View>

      {/* Main row: project name + meta | actions */}
      <View
        className="flex-row items-center justify-between px-6"
        style={{ paddingVertical: 10, gap: 16 }}
      >
        {/* Left: project name + meta */}
        <View className="flex-1 flex-col" style={{ gap: 5 }}>
          <Text
            className="font-heading font-bold text-foreground"
            style={{ fontSize: 18, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {currentLabel}
          </Text>
          <View className="flex-row items-center flex-wrap" style={{ gap: 10 }}>
            <StatusBadge status={status} />
            <Text className="font-body text-xs text-foreground">
              {sourceErp}
              <Text className="text-muted-foreground"> → </Text>
              {targetErp}
            </Text>
            <Text className="font-mono text-xs text-muted-foreground">
              Project ID: {projectId}
            </Text>
          </View>
        </View>

        {/* Right: action buttons */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Pressable
            onPress={onShare}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background"
            testID="topbar-share-btn"
          >
            <Share2 size={13} color={colors.foreground} />
            <Text className="font-body text-xs font-semibold text-foreground">
              Share
            </Text>
          </Pressable>
          <Pressable
            onPress={onActionsPress}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary"
            testID="topbar-actions-btn"
          >
            <Text className="font-body text-xs font-semibold text-primary-foreground">
              Actions
            </Text>
            <ChevronDown size={13} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};
