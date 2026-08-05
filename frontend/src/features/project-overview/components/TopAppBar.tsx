import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, ArrowRight } from 'lucide-react-native';
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

function formatOrgId(displayCode: string | undefined, createdAt: Date | undefined): string | undefined {
  if (!displayCode || !createdAt) return undefined;
  const orgPrefix = displayCode.split('-')[0] ?? 'ORG';
  const d = String(createdAt.getDate()).padStart(2, '0');
  const m = String(createdAt.getMonth() + 1).padStart(2, '0');
  const y = String(createdAt.getFullYear()).slice(-2);
  return `${orgPrefix}-${d}${m}${y}`;
}

interface TopAppBarProps {
  readonly breadcrumb: readonly [string, string];
  readonly status: ProjectStatus;
  readonly sourceErp: string;
  readonly targetErp: string;
  readonly projectId: string;
  readonly displayCode?: string;
  readonly createdAt?: Date;
  readonly onBack?: () => void;
  readonly testID?: string;
}

export const TopAppBar = ({
  breadcrumb,
  status,
  sourceErp,
  targetErp,
  projectId,
  displayCode,
  createdAt,
  onBack,
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
          <Text className="font-heading text-2xl font-bold text-foreground">
            {parentLabel}
          </Text>
        </Pressable>
        <ChevronRight size={14} color={colors.mutedForeground} />
        <Text
          className="font-heading text-2xl font-bold text-foreground"
          numberOfLines={1}
        >
          {currentLabel}
        </Text>
        <StatusBadge status={status} size="md" className="ml-3 self-center" />
      </View>

      {/* Row 2: Source ERP → Target ERP · Project ID */}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Text className="font-body text-sm text-muted-foreground">
          {resolveErpName(sourceErp)}
        </Text>
        <ArrowRight size={14} color={colors.mutedForeground} />
        <Text className="font-body text-sm text-muted-foreground">
          {resolveErpName(targetErp)}
        </Text>
        <Text className="font-mono text-sm text-muted-foreground ml-6">
          Organisation-Project-ID: {displayCode ?? projectId}
        </Text>
        {formatOrgId(displayCode, createdAt) !== undefined && (
          <Text className="font-mono text-sm text-muted-foreground ml-6">
            Organisation ID: {formatOrgId(displayCode, createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
};
