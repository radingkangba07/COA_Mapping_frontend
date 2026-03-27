import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { EmptyState, UploadingState, UploadedState } from './FileUploadStates';

const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
] as const;

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv';

type NativePickedFile = { uri: string; name: string; mimeType: string };

interface FileUploadBoxProps {
  label: string;
  isRequired?: boolean;
  file: { name: string; rowCount: number } | null;
  onFilePicked: (file: File | NativePickedFile) => void;
  onRemove: () => void;
  onPreview?: () => void;
  isUploading?: boolean;
  testID?: string;
}

export const FileUploadBox = ({
  label,
  isRequired = false,
  file,
  onFilePicked,
  onRemove,
  onPreview,
  isUploading = false,
  testID = 'file-upload-box',
}: FileUploadBoxProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleWebClick = useCallback(() => {
    if (isUploading || file) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_EXTENSIONS;
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      const selected = target?.files?.[0];
      if (selected) {
        onFilePicked(selected);
      }
    };
    inputRef.current = input;
    input.click();
  }, [isUploading, file, onFilePicked]);

  const handleNativePress = useCallback(async (): Promise<void> => {
    if (isUploading || file) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: [...ACCEPTED_MIME_TYPES],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset) {
        onFilePicked({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? 'application/octet-stream',
        });
      }
    }
  }, [isUploading, file, onFilePicked]);

  const handlePress = useCallback(() => {
    if (isWeb) {
      handleWebClick();
    } else {
      void handleNativePress();
    }
  }, [handleWebClick, handleNativePress]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (isUploading || file) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFilePicked(droppedFile);
      }
    },
    [isUploading, file, onFilePicked],
  );

  const handleRemove = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      onRemove();
    },
    [onRemove],
  );

  const handlePreview = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      onPreview?.();
    },
    [onPreview],
  );

  const webDragProps = isWeb
    ? {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
      }
    : {};

  return (
    <View testID={testID}>
      <View className="mb-1.5 flex-row items-center">
        <Text className="font-body text-sm font-medium text-foreground">
          {label}
        </Text>
        {isRequired && (
          <Text className="ml-0.5 text-destructive">*</Text>
        )}
      </View>

      <Pressable
        onPress={handlePress}
        disabled={isUploading}
        accessibilityRole="button"
        accessibilityLabel={
          file
            ? `${label}: ${file.name} uploaded`
            : `${label}: tap to select a file`
        }
        testID={`${testID}-zone`}
        {...webDragProps}
      >
        <View
          className={cn(
            'rounded-lg p-4',
            file
              ? 'border border-border bg-surface'
              : 'border-2 border-dashed bg-background',
            !file && isDragOver
              ? 'border-accent bg-accent/5'
              : !file
                ? 'border-border'
                : '',
          )}
          style={{ minHeight: 140 }}
        >
          {isUploading ? (
            <UploadingState />
          ) : file ? (
            <UploadedState
              fileName={file.name}
              rowCount={file.rowCount}
              onRemove={handleRemove}
              onPreview={onPreview ? handlePreview : undefined}
            />
          ) : (
            <EmptyState isDragOver={isDragOver} />
          )}
        </View>
      </Pressable>
    </View>
  );
};
