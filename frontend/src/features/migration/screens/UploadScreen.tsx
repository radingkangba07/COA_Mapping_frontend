import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { FileUploader } from '../components/FileUploader/FileUploader';
import { useMigrationViewModel } from '../hooks/useMigrationViewModel';
import { useMigrationScreenRoute } from '@/navigation/types';
import { colors } from '@/config/theme';
import type { MigrationStackParamList } from '@/navigation/types';
import type { PickedFile } from '../hooks/useFileUpload';

type MigrationNavigation = NativeStackNavigationProp<MigrationStackParamList>;

/**
 * Adapts a raw file from FileUploadBox (File | NativePickedFile) into
 * the PickedFile shape the ViewModel handlers expect.
 */
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
    currentStep,
    completedSteps,
    sourceERP,
    targetERP,
    sourceFile,
    targetFile,
    mappingFile,
    isLoading,
    canProceedFromStep1,
    goToStep,
    handleSourceFilePicked,
    handleTargetFilePicked,
    handleMappingFilePicked,
    handleRemoveSourceFile,
    handleRemoveTargetFile,
    handleRemoveMappingFile,
    handleDownloadSample,
    processFiles,
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

  const handleDownload = useCallback(
    (_erpId: string, _type: 'source' | 'target'): void => {
      void handleDownloadSample(_erpId);
    },
    [handleDownloadSample],
  );

  const handleBack = useCallback((): void => {
    goToStep(0);
    navigation.navigate('ERPSelect', { projectId });
  }, [goToStep, navigation, projectId]);

  const handleContinue = useCallback(async (): Promise<void> => {
    await processFiles();
    navigation.navigate('Mapping', { projectId });
  }, [processFiles, navigation, projectId]);

  const sourceFileInfo = sourceFile
    ? { name: sourceFile.name, rowCount: sourceFile.rowCount }
    : null;
  const targetFileInfo = targetFile
    ? { name: targetFile.name, rowCount: targetFile.rowCount }
    : null;
  const mappingFileInfo = mappingFile
    ? { name: mappingFile.name, rowCount: mappingFile.rowCount }
    : null;

  return (
    <Screen scroll testID="upload-screen">
      <View className="max-w-4xl lg:max-w-6xl flex-1 self-center w-full px-4 py-6 gap-6 lg:gap-8">
        <MigrationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepPress={goToStep}
        />

        <ERPSummaryCard
          sourceName={sourceERP?.name ?? 'Not selected'}
          targetName={targetERP?.name ?? 'Not selected'}
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
          sourceERP={sourceERP?.id}
          targetERP={targetERP?.id}
          onDownloadSample={handleDownload}
          isUploading={isLoading}
          testID="upload-file-uploader"
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
            onPress={() => void handleContinue()}
            disabled={!canProceedFromStep1}
            isLoading={isLoading}
            testID="upload-continue-button"
          >
            Process Files
          </Button>
        </View>
      </View>
    </Screen>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ERPSummaryCardProps {
  sourceName: string;
  targetName: string;
}

const ERPSummaryCard = React.memo(function ERPSummaryCard({
  sourceName,
  targetName,
}: ERPSummaryCardProps) {
  return (
    <Card testID="upload-erp-summary">
      <Card.Content className="flex-row items-center gap-3">
        <View className="flex-1 items-start">
          <Text className="font-body text-xs text-muted-foreground">Source</Text>
          <Text className="font-heading text-sm font-semibold text-foreground">
            {sourceName}
          </Text>
        </View>

        <ArrowRight size={20} color={colors.mutedForeground} strokeWidth={2} />

        <View className="flex-1 items-end">
          <Text className="font-body text-xs text-muted-foreground">Target</Text>
          <Text className="font-heading text-sm font-semibold text-foreground">
            {targetName}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
});
