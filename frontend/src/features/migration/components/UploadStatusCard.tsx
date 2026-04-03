import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle, Circle } from 'lucide-react-native';
import { colors } from '@/config/theme';

interface UploadStatusCardProps {
  readonly sourceFile: { name: string; rowCount: number } | null;
  readonly targetFile: { name: string; rowCount: number } | null;
  readonly mappingFile: { name: string; rowCount: number } | null;
}

export function UploadStatusCard({ sourceFile, targetFile, mappingFile }: UploadStatusCardProps) {
  const items = [
    { label: 'Source COA', file: sourceFile, unit: 'rows' },
    { label: 'Target COA', file: targetFile, unit: 'rows' },
    { label: 'Type Mapping', file: mappingFile, unit: 'mappings' },
  ];

  return (
    <View testID="upload-status-card">
      <Text className="font-heading text-sm font-semibold text-foreground mb-2">
        Upload Status
      </Text>
      <View className="flex-row gap-3">
        {items.map((item) => (
          <View
            key={item.label}
            className={`flex-1 flex-row items-center gap-1.5 rounded-lg border px-3 py-2.5 ${
              item.file !== null
                ? 'border-border bg-card'
                : 'border-border bg-background'
            }`}
          >
            {item.file !== null ? (
              <CheckCircle size={14} color={colors.success} strokeWidth={2} />
            ) : (
              <Circle size={14} color={colors.mutedForeground} strokeWidth={2} />
            )}
            <Text
              className={`font-body text-xs font-medium ${
                item.file !== null ? 'text-green-800 dark:text-green-400' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Text>
            {item.file !== null && (
              <Text className="font-mono text-xs text-green-700 dark:text-green-500">
                {item.file.rowCount} {item.unit}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
