import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { FileUploadBox } from './FileUploadBox';

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
  onSourcePreview?: () => void;
  onTargetPreview?: () => void;
  onMappingPreview?: () => void;
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
  onSourcePreview,
  onTargetPreview,
  onMappingPreview,
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

  return (
    <View testID={testID} className="gap-6">
      <View className="flex-col gap-4 md:flex-row">
        <View className="flex-1">
          <FileUploadBox
            label="1. Source ERP COA"
            isRequired
            file={sourceFile}
            onFilePicked={onSourceFilePicked}
            onRemove={onSourceRemove}
            onPreview={sourceFile !== null ? onSourcePreview : undefined}
            isUploading={isUploading}
            testID={`${testID}-source`}
          />
        </View>

        <View className="flex-1">
          <FileUploadBox
            label="2. Target ERP COA"
            file={targetFile}
            onFilePicked={onTargetFilePicked}
            onRemove={onTargetRemove}
            onPreview={targetFile !== null ? onTargetPreview : undefined}
            isUploading={isUploading}
            testID={`${testID}-target`}
          />
        </View>

        <View className="flex-1">
          <FileUploadBox
            label="3. Account Type Mapping"
            file={mappingFile}
            onFilePicked={onMappingFilePicked}
            onRemove={onMappingRemove}
            onPreview={mappingFile !== null ? onMappingPreview : undefined}
            isUploading={isUploading}
            testID={`${testID}-mapping`}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text
          className="font-body text-sm text-muted-foreground"
          testID={`${testID}-summary`}
        >
          {uploadSummary.label}
        </Text>
      </View>

    </View>
  );
};
