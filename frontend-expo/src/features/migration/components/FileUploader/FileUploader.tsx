import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Download } from 'lucide-react-native';
import { FileUploadBox } from './FileUploadBox';
import { Card } from '@/shared/components/ui/Card';
import { colors } from '@/config/theme';

type PickedFile = File | { uri: string; name: string; mimeType: string };

type UploadedFileInfo = { name: string; rowCount: number } | null;

interface FileUploaderProps {
  sourceFile: UploadedFileInfo;
  targetFile: UploadedFileInfo;
  mappingFile: UploadedFileInfo;
  onSourceFilePicked: (file: PickedFile) => void;
  onTargetFilePicked: (file: PickedFile) => void;
  onMappingFilePicked: (file: PickedFile) => void;
  onSourceRemove: () => void;
  onTargetRemove: () => void;
  onMappingRemove: () => void;
  sourceERP?: string;
  targetERP?: string;
  onDownloadSample?: (erpId: string, type: 'source' | 'target') => void;
  isUploading?: boolean;
  testID?: string;
}

export const FileUploader = ({
  sourceFile,
  targetFile,
  mappingFile,
  onSourceFilePicked,
  onTargetFilePicked,
  onMappingFilePicked,
  onSourceRemove,
  onTargetRemove,
  onMappingRemove,
  sourceERP,
  targetERP,
  onDownloadSample,
  isUploading = false,
  testID = 'file-uploader',
}: FileUploaderProps) => {
  const uploadSummary = useMemo(() => {
    const requiredUploaded = sourceFile !== null ? 1 : 0;
    const optionalUploaded =
      (targetFile !== null ? 1 : 0) + (mappingFile !== null ? 1 : 0);
    const totalUploaded = requiredUploaded + optionalUploaded;

    return {
      requiredUploaded,
      totalUploaded,
      label:
        requiredUploaded === 1
          ? `${totalUploaded} of 1 required file${totalUploaded > 1 ? ` (+${optionalUploaded} optional)` : ''} uploaded`
          : '0 of 1 required files uploaded',
    };
  }, [sourceFile, targetFile, mappingFile]);

  const handleDownloadSource = useCallback(() => {
    if (sourceERP && onDownloadSample) {
      onDownloadSample(sourceERP, 'source');
    }
  }, [sourceERP, onDownloadSample]);

  const handleDownloadTarget = useCallback(() => {
    if (targetERP && onDownloadSample) {
      onDownloadSample(targetERP, 'target');
    }
  }, [targetERP, onDownloadSample]);

  const hasSampleSection =
    onDownloadSample !== undefined &&
    (sourceERP !== undefined || targetERP !== undefined);

  return (
    <View testID={testID} className="gap-6">
      <View className="flex-col gap-4 md:flex-row md:gap-6">
        <View className="flex-1">
          <FileUploadBox
            label="Source Chart of Accounts"
            isRequired
            file={sourceFile}
            onFilePicked={onSourceFilePicked}
            onRemove={onSourceRemove}
            isUploading={isUploading}
            testID={`${testID}-source`}
          />
        </View>

        <View className="flex-1">
          <FileUploadBox
            label="Target Chart of Accounts"
            file={targetFile}
            onFilePicked={onTargetFilePicked}
            onRemove={onTargetRemove}
            isUploading={isUploading}
            testID={`${testID}-target`}
          />
        </View>

        <View className="flex-1">
          <FileUploadBox
            label="Type Mapping File"
            file={mappingFile}
            onFilePicked={onMappingFilePicked}
            onRemove={onMappingRemove}
            isUploading={isUploading}
            testID={`${testID}-mapping`}
          />
        </View>
      </View>

      <View className="flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Text
          className="font-body text-sm text-muted-foreground"
          testID={`${testID}-summary`}
        >
          {uploadSummary.label}
        </Text>
      </View>

      {hasSampleSection && (
        <Card testID={`${testID}-samples`}>
          <Card.Content className="gap-3">
            <Text className="font-heading text-sm font-semibold text-foreground">
              Sample Files
            </Text>
            <Text className="font-body text-xs text-muted-foreground">
              Download sample files to see the expected format for each ERP
              system.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {sourceERP !== undefined && (
                <SampleDownloadLink
                  label={`${sourceERP} Source`}
                  onPress={handleDownloadSource}
                  testID={`${testID}-sample-source`}
                />
              )}
              {targetERP !== undefined && (
                <SampleDownloadLink
                  label={`${targetERP} Target`}
                  onPress={handleDownloadTarget}
                  testID={`${testID}-sample-target`}
                />
              )}
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

interface SampleDownloadLinkProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

const SampleDownloadLink = React.memo(function SampleDownloadLink({
  label,
  onPress,
  testID,
}: SampleDownloadLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1.5 rounded-md border border-border px-3 py-2"
      accessibilityRole="button"
      accessibilityLabel={`Download ${label} sample file`}
      testID={testID}
    >
      <Download size={14} color={colors.accent} strokeWidth={2} />
      <Text className="font-body text-xs font-medium text-accent">
        {label}
      </Text>
    </Pressable>
  );
});
