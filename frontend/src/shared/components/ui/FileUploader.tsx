import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Upload } from 'lucide-react-native';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';

export interface NativePickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export type UploadedFile = File | NativePickedFile;

interface FileUploaderProps {
  onFilePicked: (file: UploadedFile) => void;
  accept?: string;
  documentPickerTypes?: string[];
  browseLabel?: string;
  hint?: string;
  expectedColumns?: string[];
  disabled?: boolean;
  testID?: string;
}

export const FileUploader = ({
  onFilePicked,
  accept = '.csv,text/csv',
  documentPickerTypes = ['text/csv', 'text/comma-separated-values'],
  browseLabel = 'Drag & drop your CSV here, or ',
  hint = 'CSV with a header row · up to 10 MB',
  expectedColumns = ['Account No', 'Customer Name', 'VAT No', 'Email'],
  disabled = false,
  testID = 'file-uploader-dropzone',
}: FileUploaderProps): React.JSX.Element => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropZoneRef = useRef<View>(null);

  const handleNativePick = useCallback(async (): Promise<void> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: documentPickerTypes,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onFilePicked({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    });
  }, [documentPickerTypes, onFilePicked]);

  const handlePress = useCallback((): void => {
    if (disabled) return;
    if (isWeb) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e: Event): void => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) onFilePicked(file);
      };
      input.click();
    } else {
      void handleNativePick();
    }
  }, [disabled, accept, onFilePicked, handleNativePick]);

  useEffect(() => {
    if (!isWeb || disabled) return;
    const el = dropZoneRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const onOver = (e: DragEvent): void => { e.preventDefault(); setIsDragOver(true); };
    const onLeave = (e: DragEvent): void => { e.preventDefault(); setIsDragOver(false); };
    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) onFilePicked(file);
    };
    el.addEventListener('dragover', onOver);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onOver);
      el.removeEventListener('dragleave', onLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [disabled, onFilePicked]);

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      disabled={disabled}
      className="flex-1"
      testID={testID}
    >
      <View
        ref={dropZoneRef}
        className={cn(
          'flex-1  border border-dashed rounded-xl p-7 items-center justify-center gap-2 bg-surface-highlight',
          isDragOver ? 'border-accent' : isHovered ? 'border-secondary-foreground' : 'border-border',
        )}
      >
        <View className="w-10 h-10 rounded-lg items-center justify-center bg-accent/10">
          <Upload size={22} color={colors.accent} strokeWidth={2} />
        </View>
        <Text className="text-sm font-semibold text-center font-heading text-foreground">
          {browseLabel}
          <Text className="text-accent underline">browse</Text>
        </Text>
        <Text className="text-xs text-center font-body text-muted-foreground">{hint}</Text>
        {expectedColumns.length > 0 && (
          <Text className="text-xs font-mono text-center my-3 text-muted-foreground">
            {'expects: '} {expectedColumns.slice(0, 4).join(', ')}{ ' …'}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

// ─── FileUploadField ─────────────────────────────────────────────────────────
// Labelled wrapper around FileUploader: renders the dropzone until a file is
// picked, then swaps to a file summary card (name, row count, missing-column
// warning, preview/remove actions). All colour is Tailwind className tokens
// from config/theme — the file-type and expected-columns tags default to
// the shared success/warning tints, and a caller can restyle the tag via
// `tagClassName` (e.g. the master-data-wizard uses the `chip` token there).

export interface FileUploaderTone {
  bg: string;
  fg: string;
}

export interface FileUploadFieldProps {
  label: React.ReactNode;
  subLabel?: React.ReactNode;
  hasFile: boolean;
  fileName?: string | null;
  rowCount?: number;
  fileTypeLabel?: string;
  tagLabel?: string;
  /** Tailwind classes for the tag pill's background + text; defaults to a success tint. */
  tagClassName?: string;
  expectedColumns?: string[];
  columnWarning?: string[];
  showPreview?: boolean;
  onFilePicked: (file: UploadedFile) => void;
  onTogglePreview?: () => void;
  onRemove?: () => void;
  accept?: string;
  documentPickerTypes?: string[];
  browseLabel?: string;
  hint?: string;
  testID?: string;
}

export const FileUploadField = ({
  label,
  subLabel,
  hasFile,
  fileName = null,
  rowCount = 0,
  fileTypeLabel = 'CSV',
  tagLabel = 'SOURCE',
  tagClassName = 'bg-impact-clean text-success',
  columnWarning = [],
  showPreview = false,
  onFilePicked,
  onTogglePreview,
  onRemove,
  accept,
  documentPickerTypes,
  browseLabel,
  hint,
  testID = 'file-upload-field-dropzone',
}: FileUploadFieldProps): React.JSX.Element => {
  return (
    <View className="flex-1">
      <Text className="text-base font-bold mb-1 font-heading text-foreground">{label}</Text>
      {subLabel !== undefined && (
        <Text className="text-xs mb-3 font-body text-muted-foreground">{subLabel}</Text>
      )}

      {!hasFile ? (
        <FileUploader
          onFilePicked={onFilePicked}
          accept={accept}
          documentPickerTypes={documentPickerTypes}
          browseLabel={browseLabel}
          hint={hint}
          testID={testID}
        />
      ) : (
        <View className="border rounded-xl p-6 border-border">
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-lg items-center justify-center shrink-0 bg-impact-clean">
              <Text className="text-xs font-bold text-success">{fileTypeLabel}</Text>
            </View>
            <View className="flex-1 min-w-auto">
              <Text className="text-sm font-semibold font-body text-foreground" numberOfLines={1}>{fileName}</Text>
              <Text className="text-xs mt-1 text-muted-foreground">{rowCount} rows loaded</Text>
            </View>
            <View className={cn('rounded-full px-3 py-1 shrink-0', tagClassName)}>
              <Text className="text-xs font-bold tracking-wide font-body">{tagLabel}</Text>
            </View>
          </View>

          {columnWarning.length > 0 && (
            <View className="mt-3 rounded-lg p-3 bg-find-warn">
              <Text className="text-xs leading-normal font-body text-warning">
                {columnWarning.length} expected {columnWarning.length === 1 ? 'column is' : 'columns are'} not present:{' '}
                {columnWarning.join(', ')}. Profiling will still run, but these fields cannot be mapped.
              </Text>
            </View>
          )}

          <View className="flex-row gap-2 mt-3">
            <Pressable
              onPress={onTogglePreview}
              className="flex-1 flex-row items-center justify-center border rounded-lg px-4 py-2 border-border bg-card"
            >
              <Text className="text-xs font-medium font-body text-foreground">{showPreview ? 'Hide preview' : 'Preview'}</Text>
            </Pressable>
            <Pressable
              onPress={onRemove}
              className="w-10 h-10 border rounded-lg items-center justify-center border-border bg-card"
            >
              <Text className="text-base text-destructive">✕</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

// ─── FileTargetCard ──────────────────────────────────────────────────────────
// Read-only counterpart to FileUploadField: displays a resolved target-system
// summary (badge initials, name, record note, description) next to the
// source field. Purely presentational — the caller resolves the target and
// passes the result down as props.
//
// `badgeTone` is the one prop that still takes a raw {bg,fg} colour pair
// rather than a className: it exists so a caller can show an ERP's actual
// brand colour (shared/constants/erp-systems.ts), which is per-vendor data,
// not a design token this app can name a Tailwind class after.

export interface FileTargetCardProps {
  label: React.ReactNode;
  subLabel?: React.ReactNode;
  badgeText: string;
  badgeTone?: FileUploaderTone;
  title: string;
  subtitle?: string;
  description?: string;
  tagLabel?: string;
}

export const FileTargetCard = ({
  label,
  subLabel,
  badgeText,
  badgeTone,
  title,
  subtitle,
  description,
  tagLabel = '✓ TARGET',
}: FileTargetCardProps): React.JSX.Element => {
  return (
    <View className="flex-1">
      <Text className="text-base font-bold mb-1 font-heading text-foreground">{label}</Text>
      {subLabel !== undefined && (
        <Text className="text-xs mb-3 font-body text-muted-foreground">{subLabel}</Text>
      )}

      <View className="flex-1 border border-border rounded-xl p-4 justify-center">
        <View className="flex-row items-center gap-3">
          <View
            className={cn('w-9 h-9 rounded-lg items-center justify-center shrink-0', badgeTone === undefined && 'bg-find-info')}
            style={badgeTone !== undefined ? { backgroundColor: badgeTone.bg } : undefined}
          >
            <Text
              className={cn('text-xs font-bold', badgeTone === undefined && 'text-accent')}
              style={badgeTone !== undefined ? { color: badgeTone.fg } : undefined}
            >
              {badgeText}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold font-body text-foreground" numberOfLines={1}>{title}</Text>
            {subtitle !== undefined && subtitle.length > 0 && (
              <Text className="text-xs mt-1 text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
            )}
          </View>
          <View className="rounded-full px-3 py-1 shrink-0 bg-impact-clean">
            <Text className="text-xs font-bold tracking-wide font-body text-success">{tagLabel}</Text>
          </View>
        </View>
        {description !== undefined && (
          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-xs leading-normal font-body text-muted-foreground">{description}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
