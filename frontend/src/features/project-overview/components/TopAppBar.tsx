import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, Pencil, ArrowRight } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { StatusBadge } from '@/features/projects/components/StatusBadge';
import type { ProjectStatus } from '@/features/projects/types/projects.types';
import { getERPById } from '@/shared/constants/erp-systems';

function resolveErpName(raw: string | undefined | null): string {
  if (!raw || raw.trim() === '') return '—';
  const found = getERPById(raw);
  if (found) return found.name;
  // Humanise unknown IDs: "microsoft_dynamics" → "Microsoft Dynamics"
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TopAppBarProps {
  readonly breadcrumb: readonly [string, string];
  readonly status: ProjectStatus;
  readonly sourceErp: string;
  readonly targetErp: string;
  readonly projectId: string;
  readonly onBack?: () => void;
  readonly onEdit?: () => void;
  readonly testID?: string;
}

export const TopAppBar = ({
  breadcrumb,
  status,
  sourceErp,
  targetErp,
  projectId,
  onBack,
  onEdit,
  testID,
}: TopAppBarProps): React.JSX.Element => {
  const [parentLabel, currentLabel] = breadcrumb;

  return (
    <View
      className="border-b border-border bg-background px-6"
      style={{ paddingVertical: 12, gap: 4 }}
      testID={testID}
    >
      {/* Row 1: Projects › Project Name  [Status]  ✏️ */}
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Pressable onPress={onBack} testID="topbar-back">
          <Text className="font-body text-muted-foreground" style={{ fontSize: 15 }}>
            {parentLabel}
          </Text>
        </Pressable>
        <ChevronRight size={14} color={colors.mutedForeground} />
        <Text
          className="font-heading font-bold text-foreground"
          style={{ fontSize: 15 }}
          numberOfLines={1}
        >
          {currentLabel}
        </Text>
        <StatusBadge status={status} />
        <Pressable onPress={onEdit} hitSlop={8} testID="topbar-edit-btn">
          <Pencil size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Row 2: Source ERP → Target ERP · Project ID */}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Text className="font-body text-muted-foreground" style={{ fontSize: 13 }}>
          {resolveErpName(sourceErp)}
        </Text>
        <ArrowRight size={12} color={colors.mutedForeground} />
        <Text className="font-body text-muted-foreground" style={{ fontSize: 13 }}>
          {resolveErpName(targetErp)}
        </Text>
        <Text className="text-muted-foreground" style={{ fontSize: 12 }}>·</Text>
        <Text className="font-mono text-muted-foreground" style={{ fontSize: 12 }}>
          Project ID: {projectId}
        </Text>
      </View>
    </View>
  );
};
