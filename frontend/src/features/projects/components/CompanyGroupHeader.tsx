import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Building2, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react-native';
import type { CompanyId } from '@/shared/types/common.types';

const GROUP_BG = 'rgba(0,51,153,0.06)';
const GROUP_ICON = '#003399';

interface CompanyGroupHeaderProps {
  companyName: string;
  companySlug: CompanyId | null;
  projectCount: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  onCreatePress: () => void;
  testID?: string;
}

export function CompanyGroupHeader({
  companyName,
  companySlug,
  projectCount,
  isExpanded = true,
  onToggle,
  testID,
}: CompanyGroupHeaderProps) {
  const isUnassigned = companySlug === null;
  const Icon = isUnassigned ? FolderOpen : Building2;
  const projectLabel = projectCount === 1 ? '1 project' : `${projectCount} projects`;
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <Pressable
      onPress={onToggle}
      testID={testID}
      className="flex-row items-center py-3.5 px-4 gap-2.5 border-b border-border"
      style={{ backgroundColor: GROUP_BG, cursor: onToggle ? 'pointer' : 'default' } as Record<string, unknown>}
    >
      {onToggle ? <Chevron size={14} color={GROUP_ICON} /> : null}
      <Icon size={16} color={GROUP_ICON} />
      <Text className="font-heading text-sm font-semibold text-foreground">
        {companyName}
      </Text>
      <Text className="font-body text-xs text-muted-foreground">
        {projectLabel}
      </Text>
    </Pressable>
  );
}
