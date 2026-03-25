import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Upload, FileSpreadsheet, X, Eye } from 'lucide-react-native';
import { isWeb } from '@/shared/utils/platform.utils';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Badge } from '@/shared/components/ui/Badge';
import { colors } from '@/config/theme';

interface EmptyStateProps {
  isDragOver: boolean;
}

export const EmptyState = React.memo(function EmptyState({
  isDragOver,
}: EmptyStateProps) {
  return (
    <View className="items-center gap-1.5 py-2 md:gap-2 md:py-4">
      <Upload
        size={isWeb ? 28 : 22}
        color={isDragOver ? colors.accent : colors.mutedForeground}
        strokeWidth={1.5}
      />
      <Text className="text-center font-body text-sm text-muted-foreground">
        {isWeb
          ? 'Drop file here or click to browse'
          : 'Tap to select a file'}
      </Text>
      <Text className="font-body text-xs text-muted-foreground">
        .xlsx, .xls, or .csv
      </Text>
    </View>
  );
});

export const UploadingState = React.memo(function UploadingState() {
  return (
    <View className="items-center gap-2 py-4">
      <Spinner size="md" testID="file-upload-spinner" />
      <Text className="font-body text-sm text-muted-foreground">
        Uploading...
      </Text>
    </View>
  );
});

interface UploadedStateProps {
  fileName: string;
  rowCount: number;
  onRemove: (e: { stopPropagation?: () => void }) => void;
  onPreview?: (e: { stopPropagation?: () => void }) => void;
}

export const UploadedState = React.memo(function UploadedState({
  fileName,
  rowCount,
  onRemove,
  onPreview,
}: UploadedStateProps) {
  return (
    <View className="w-full flex-row items-center gap-3 px-1">
      <FileSpreadsheet
        size={24}
        color={colors.success}
        strokeWidth={1.5}
      />
      <View className="flex-1 gap-0.5">
        <Text
          className="font-body text-sm font-medium text-foreground"
          numberOfLines={1}
        >
          {fileName}
        </Text>
        <Badge variant="secondary" className="self-start">
          {`${rowCount} rows`}
        </Badge>
      </View>
      <View className="flex-row items-center gap-1">
        {onPreview && (
          <Pressable
            onPress={onPreview}
            className="rounded-md p-1.5"
            accessibilityRole="button"
            accessibilityLabel="Preview file"
            testID="file-preview-button"
          >
            <Eye size={18} color={colors.mutedForeground} strokeWidth={1.5} />
          </Pressable>
        )}
        <Pressable
          onPress={onRemove}
          className="rounded-md p-1.5"
          accessibilityRole="button"
          accessibilityLabel="Remove file"
          testID="file-remove-button"
        >
          <X size={18} color={colors.destructive} strokeWidth={1.5} />
        </Pressable>
      </View>
    </View>
  );
});
