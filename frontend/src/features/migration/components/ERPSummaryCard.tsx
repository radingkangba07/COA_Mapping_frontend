import React from 'react';
import { View, Text } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { ERPIcon } from './ERPIcon';
import { colors } from '@/config/theme';

interface ERPSummaryCardProps {
  sourceName: string;
  targetName: string;
  sourceErpId?: string;
  targetErpId?: string;
}

export const ERPSummaryCard = React.memo(function ERPSummaryCard({
  sourceName,
  targetName,
  sourceErpId,
  targetErpId,
}: ERPSummaryCardProps) {
  return (
    <Card testID="upload-erp-summary">
      <Card.Content className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          {sourceErpId ? <ERPIcon erpId={sourceErpId} size={32} /> : null}
          <View>
            <Text className="font-body text-xs text-muted-foreground">Source</Text>
            <Text className="font-heading text-sm font-semibold text-foreground">{sourceName}</Text>
          </View>
        </View>

        <ArrowRight size={20} color={colors.mutedForeground} strokeWidth={2} />

        <View className="flex-1 flex-row items-center justify-end gap-3">
          <View className="items-end">
            <Text className="font-body text-xs text-muted-foreground">Target</Text>
            <Text className="font-heading text-sm font-semibold text-foreground">{targetName}</Text>
          </View>
          {targetErpId ? <ERPIcon erpId={targetErpId} size={32} /> : null}
        </View>
      </Card.Content>
    </Card>
  );
});
