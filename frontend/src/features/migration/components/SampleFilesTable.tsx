import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';

interface SampleFilesTableProps {
  sourceErpId?: string;
  sourceErpName?: string;
  targetErpId?: string;
  targetErpName?: string;
  onDownload: (erpId: string, type: 'source' | 'target') => void;
  onPreview: (erpId: string, type: 'source' | 'target') => void;
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
  onPreview,
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

  const handlePreview = useCallback(
    (row: SampleFileRow) => {
      if (row.erpId) {
        onPreview(row.erpId, row.type);
      }
    },
    [onPreview],
  );

  return (
    <View testID={testID ?? 'sample-files-table'}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-heading text-sm font-semibold text-foreground">
          Sample Files
        </Text>
        {onLoadAll && (
          <Button
            variant="outline"
            size="sm"
            onPress={onLoadAll}
            isLoading={isLoading}
            testID="sample-load-all"
          >
            Load All
          </Button>
        )}
      </View>
      <Text className="text-xs text-muted-foreground mb-2">
        Preview or download sample files for testing
      </Text>
      {rows.map((row, index) => (
        <View
          key={row.name}
          className={`flex-row items-center py-2.5 gap-3 ${
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
            <Button
              variant="outline"
              size="sm"
              textClassName="text-xs"
              onPress={() => handlePreview(row)}
              disabled={!row.erpId}
              testID={`sample-preview-${index}`}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              textClassName="text-xs"
              onPress={() => handleDownload(row)}
              disabled={!row.erpId}
              testID={`sample-download-${index}`}
            >
              Download
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
};