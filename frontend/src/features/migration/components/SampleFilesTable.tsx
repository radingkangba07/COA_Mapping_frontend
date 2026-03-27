import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';

interface SampleFilesTableProps {
  sourceErpId?: string;
  sourceErpName?: string;
  targetErpId?: string;
  targetErpName?: string;
  onDownload: (erpId: string, type: 'source' | 'target') => void;
  onLoadAll?: () => void;
  isLoading?: boolean;
  testID?: string;
}

interface SampleFileRow {
  name: string;
  description: string;
  erpId: string | undefined;
  type: 'source' | 'target';
}

export const SampleFilesTable = ({
  sourceErpId,
  sourceErpName,
  targetErpId,
  targetErpName,
  onDownload,
  onLoadAll,
  isLoading = false,
  testID,
}: SampleFilesTableProps) => {
  const rows: SampleFileRow[] = [
    {
      name: `${sourceErpName ?? 'Source'} COA Sample`,
      description: 'Sample Chart of Accounts for source ERP',
      erpId: sourceErpId,
      type: 'source',
    },
    {
      name: `${targetErpName ?? 'Target'} COA Sample`,
      description: 'Sample Chart of Accounts for target ERP',
      erpId: targetErpId,
      type: 'target',
    },
    {
      name: 'Account Type Mapping Sample',
      description: 'Sample mapping between source and target types',
      erpId: sourceErpId,
      type: 'source',
    },
  ];

  const handleDownload = useCallback(
    (row: SampleFileRow) => {
      if (row.erpId) {
        onDownload(row.erpId, row.type);
      }
    },
    [onDownload],
  );

  return (
    <Card testID={testID ?? 'sample-files-table'}>
      <Card.Header>
        <View className="flex-row items-center justify-between">
          <Text className="font-heading text-base font-semibold text-card-foreground">
            Sample Files
          </Text>
          {onLoadAll && (
            <Button
              size="sm"
              className="bg-accent"
              textClassName="text-accent-foreground"
              onPress={onLoadAll}
              isLoading={isLoading}
              testID="sample-load-all"
            >
              Load All
            </Button>
          )}
        </View>
        <Text className="text-xs text-muted-foreground mt-1">
          Preview or download sample files for testing
        </Text>
      </Card.Header>
      <Card.Content>
        {rows.map((row, index) => (
          <View
            key={row.name}
            className={`flex-row items-center py-3 gap-3 ${
              index < rows.length - 1 ? 'border-b border-border' : ''
            }`}
            testID={`sample-file-row-${index}`}
          >
            <FileText size={16} color={colors.mutedForeground} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">
                {row.name}
              </Text>
            </View>
            <View className="flex-1 hidden md:flex">
              <Text className="text-xs text-muted-foreground">
                {row.description}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Button variant="outline" size="sm" textClassName="text-xs">
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                textClassName="text-xs"
                onPress={() => handleDownload(row)}
              >
                Download
              </Button>
            </View>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};
