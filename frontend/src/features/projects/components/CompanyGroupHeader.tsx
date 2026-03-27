import React from 'react';
import { Text, View } from 'react-native';
import { Building2, FolderOpen, Plus } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import type { CompanyId } from '@/shared/types/common.types';

interface CompanyGroupHeaderProps {
  companyName: string;
  companySlug: CompanyId | null;
  projectCount: number;
  onCreatePress: () => void;
  testID?: string;
}

export function CompanyGroupHeader({
  companyName,
  companySlug,
  projectCount,
  onCreatePress,
  testID,
}: CompanyGroupHeaderProps) {
  const isUnassigned = companySlug === null;
  const Icon = isUnassigned ? FolderOpen : Building2;
  const subtitle = isUnassigned
    ? `${projectCount} project(s)`
    : `${companySlug} · ${projectCount} project(s)`;

  return (
    <View testID={testID} className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center gap-3 flex-1">
        <Icon size={20} color={colors.mutedForeground} />
        <View className="flex-1">
          <Text className="font-heading text-lg font-semibold text-foreground">
            {companyName}
          </Text>
          <Text className="text-xs text-muted-foreground">{subtitle}</Text>
        </View>
      </View>
      <Button
        testID={testID ? `${testID}-create-btn` : undefined}
        onPress={onCreatePress}
        size="sm"
        className="bg-accent"
        accessibilityLabel={`Create project for ${companyName}`}
      >
        <View className="flex-row items-center gap-1.5">
          <Plus size={14} color={colors.accentForeground} />
          <Text className="text-xs font-medium text-accent-foreground">
            New Project
          </Text>
        </View>
      </Button>
    </View>
  );
}
