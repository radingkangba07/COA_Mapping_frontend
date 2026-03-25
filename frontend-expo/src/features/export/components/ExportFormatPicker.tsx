import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { ExportFormat } from '@/features/export/types/export.types';
import { cn } from '@/shared/utils/string.utils';

interface ExportFormatPickerProps {
  readonly value: ExportFormat;
  readonly onChange: (format: ExportFormat) => void;
  readonly disabled?: boolean;
  readonly testID?: string;
}

const FORMAT_OPTIONS: readonly { label: string; value: ExportFormat; description: string }[] = [
  { label: 'Excel (.xlsx)', value: 'excel', description: 'Formatted spreadsheet with styling' },
  { label: 'CSV (.csv)', value: 'csv', description: 'Plain text, comma-separated' },
];

export function ExportFormatPicker({
  value,
  onChange,
  disabled = false,
  testID,
}: ExportFormatPickerProps): React.JSX.Element {
  return (
    <View testID={testID} className="gap-2">
      <Text className="text-sm font-medium text-foreground font-heading">
        Export Format
      </Text>
      <View className="flex-row gap-3">
        {FORMAT_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              testID={testID ? `${testID}-${option.value}` : undefined}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              className={cn(
                'flex-1 rounded-lg border-2 p-3',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background',
                disabled && 'opacity-50',
              )}
            >
              <View className="flex-row items-center gap-2">
                <View
                  className={cn(
                    'h-4 w-4 rounded-full border-2',
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground',
                  )}
                >
                  {isSelected && (
                    <View className="m-auto h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  )}
                </View>
                <Text
                  className={cn(
                    'text-sm font-medium font-body',
                    isSelected ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {option.label}
                </Text>
              </View>
              <Text className="mt-1 ml-6 text-xs text-muted-foreground font-body">
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
