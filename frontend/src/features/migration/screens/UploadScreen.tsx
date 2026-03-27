import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { FileUploader } from '../components/FileUploader/FileUploader';
import { ERPSummaryCard } from '../components/ERPSummaryCard';
import { SampleFilesTable } from '../components/SampleFilesTable';
import { useMigrationViewModel } from '../hooks/useMigrationViewModel';
import { useMigrationScreenRoute } from '@/navigation/types';
import { colors } from '@/config/theme';
import type { MigrationStackParamList } from '@/navigation/types';
import type { PickedFile } from '../hooks/useFileUpload';

type MigrationNavigation = NativeStackNavigationProp<MigrationStackParamList>;

function toPickedFile(raw: File | { uri: string; name: string; mimeType: string }): PickedFile {
  if (raw instanceof File) {
    return {
      uri: URL.createObjectURL(raw),
      name: raw.name,
      mimeType: raw.type || 'application/octet-stream',
      file: raw,
    };
  }
  return { uri: raw.uri, name: raw.name, mimeType: raw.mimeType };
}

export function UploadScreen(): React.JSX.Element {
  const navigation = useNavigation<MigrationNavigation>();
  const route = useMigrationScreenRoute<'Upload'>();
  const { projectId } = route.params;

  const {
    currentStep, completedSteps, sourceERP, targetERP,
    sourceFile, targetFile, mappingFile, isLoading, canProceedFromStep1,
    goToStep, handleSourceFilePicked, handleTargetFilePicked, handleMappingFilePicked,
    handleRemoveSourceFile, handleRemoveTargetFile, handleRemoveMappingFile,
    processFiles, handleDownloadSample,
  } = useMigrationViewModel();

  const onSourceFilePicked = useCallback(
    (file: File | { uri: string; name: string; mimeType: string }): void => {
      void handleSourceFilePicked(toPickedFile(file));
    },
    [handleSourceFilePicked],
  );
  const onTargetFilePicked = useCallback(
    (file: File | { uri: string; name: string; mimeType: string }): void => {
      void handleTargetFilePicked(toPickedFile(file));
    },
    [handleTargetFilePicked],
  );
  const onMappingFilePicked = useCallback(
    (file: File | { uri: string; name: string; mimeType: string }): void => {
      void handleMappingFilePicked(toPickedFile(file));
    },
    [handleMappingFilePicked],
  );

  const handleDashboard = useCallback((): void => {
    navigation.getParent()?.navigate('ProjectsTab');
  }, [navigation]);

  const handleBack = useCallback((): void => {
    navigation.navigate('ERPSelect', { projectId });
  }, [navigation, projectId]);

  const handleContinue = useCallback(async (): Promise<void> => {
    await processFiles();
    navigation.navigate('Mapping', { projectId });
  }, [processFiles, navigation, projectId]);

  const handleLoadAllSamples = useCallback((): void => {
    if (sourceERP?.id) void handleDownloadSample(sourceERP.id);
    if (targetERP?.id) void handleDownloadSample(targetERP.id);
  }, [sourceERP?.id, targetERP?.id, handleDownloadSample]);

  const onDownloadSample = useCallback(
    (erpId: string, _type: 'source' | 'target'): void => {
      void handleDownloadSample(erpId);
    },
    [handleDownloadSample],
  );

  const sourceFileInfo = sourceFile ? { name: sourceFile.name, rowCount: sourceFile.rowCount } : null;
  const targetFileInfo = targetFile ? { name: targetFile.name, rowCount: targetFile.rowCount } : null;
  const mappingFileInfo = mappingFile ? { name: mappingFile.name, rowCount: mappingFile.rowCount } : null;

  return (
    <Screen scroll testID="upload-screen">
      <View className="flex-1 max-w-4xl lg:max-w-6xl self-center w-full px-4 py-6 gap-6 lg:gap-8">
        <View className="flex-1 gap-6 lg:gap-8">
          <Pressable
            className="flex-row items-center gap-2"
            onPress={handleDashboard}
            testID="breadcrumb-dashboard"
          >
            <ArrowLeft size={16} color={colors.mutedForeground} strokeWidth={2} />
            <Text className="font-body text-sm text-muted-foreground">Dashboard</Text>
          </Pressable>

          <MigrationStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepPress={goToStep}
          />

          <View className="items-center gap-1">
            <Text className="font-heading text-xl font-bold text-foreground" testID="upload-screen-title">
              Upload COA Files
            </Text>
            <Text className="font-body text-sm text-muted-foreground">
              Upload your source COA, target COA, and optional account type mapping
            </Text>
          </View>

          <ERPSummaryCard
            sourceName={sourceERP?.name ?? 'Not selected'}
            targetName={targetERP?.name ?? 'Not selected'}
            sourceErpId={sourceERP?.id}
            targetErpId={targetERP?.id}
          />

          <FileUploader
            sourceFile={sourceFileInfo}
            targetFile={targetFileInfo}
            mappingFile={mappingFileInfo}
            onSourceFilePicked={onSourceFilePicked}
            onTargetFilePicked={onTargetFilePicked}
            onMappingFilePicked={onMappingFilePicked}
            onSourceRemove={handleRemoveSourceFile}
            onTargetRemove={handleRemoveTargetFile}
            onMappingRemove={handleRemoveMappingFile}
            isUploading={isLoading}
            testID="upload-file-uploader"
          />

          <SampleFilesTable
            sourceErpId={sourceERP?.id}
            sourceErpName={sourceERP?.name}
            targetErpId={targetERP?.id}
            targetErpName={targetERP?.name}
            onDownload={onDownloadSample}
            onLoadAll={handleLoadAllSamples}
            isLoading={isLoading}
            testID="sample-files-table"
          />

          <UploadStatusCard
            sourceFile={sourceFileInfo}
            targetFile={targetFileInfo}
            mappingFile={mappingFileInfo}
          />

          <View className="flex-row items-center justify-between pt-2">
            <Button
              variant="outline"
              onPress={handleBack}
              testID="upload-back-button"
            >
              Back
            </Button>
            <Button
              className="bg-accent"
              textClassName="text-accent-foreground"
              onPress={() => void handleContinue()}
              disabled={!canProceedFromStep1}
              isLoading={isLoading}
              testID="upload-continue-button"
            >
              Continue to Type Mapping
            </Button>
          </View>
        </View>
      </View>
    </Screen>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface UploadStatusCardProps {
  sourceFile: { name: string; rowCount: number } | null;
  targetFile: { name: string; rowCount: number } | null;
  mappingFile: { name: string; rowCount: number } | null;
}

function UploadStatusCard({ sourceFile, targetFile, mappingFile }: UploadStatusCardProps) {
  const items = [
    { label: 'Source COA', uploaded: sourceFile !== null },
    { label: 'Target COA', uploaded: targetFile !== null },
    { label: 'Type Mapping', uploaded: mappingFile !== null },
  ];

  return (
    <View
      className="rounded-lg border border-green-200 bg-green-50 p-4"
      testID="upload-status-card"
    >
      <Text className="font-heading text-sm font-semibold text-green-800 mb-2">
        Upload Status
      </Text>
      <View className="flex-row gap-6">
        {items.map((item) => (
          <View key={item.label} className="flex-row items-center gap-1.5">
            {item.uploaded ? (
              <CheckCircle size={14} color={colors.success} strokeWidth={2} />
            ) : (
              <Circle size={14} color={colors.mutedForeground} strokeWidth={2} />
            )}
            <Text
              className={`font-body text-xs ${
                item.uploaded ? 'text-green-800 font-medium' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
