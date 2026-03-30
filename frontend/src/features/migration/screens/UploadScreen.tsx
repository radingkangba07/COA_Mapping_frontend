import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, CheckCircle, Circle, Eye, X } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { FileUploader } from '../components/FileUploader/FileUploader';
import { ERPSummaryCard } from '../components/ERPSummaryCard';
import { SampleFilesTable } from '../components/SampleFilesTable';
import { useMigrationViewModel } from '../hooks/useMigrationViewModel';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
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
  const { isHydrating, error, retry } = useHydrateProject(createProjectId(projectId));

  const {
    currentStep, completedSteps, sourceERP, targetERP,
    sourceFile, targetFile, mappingFile, isLoading, canProceedFromStep1,
    goToStep, handleSourceFilePicked, handleTargetFilePicked, handleMappingFilePicked,
    handleRemoveSourceFile, handleRemoveTargetFile, handleRemoveMappingFile,
    processFiles, handleDownloadSample,
    handlePreviewSample, previewData, previewTitle, isPreviewOpen, closePreview,
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

  const onPreviewSample = useCallback(
    (erpId: string, _type: 'source' | 'target'): void => {
      void handlePreviewSample(erpId);
    },
    [handlePreviewSample],
  );

  if (isHydrating) {
    return (
      <Screen testID="upload-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen testID="upload-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={retry} testID="upload-error" />
      </Screen>
    );
  }

  const sourceFileInfo = sourceFile ? { name: sourceFile.name, rowCount: sourceFile.rowCount } : null;
  const targetFileInfo = targetFile ? { name: targetFile.name, rowCount: targetFile.rowCount } : null;
  const mappingFileInfo = mappingFile ? { name: mappingFile.name, rowCount: mappingFile.rowCount } : null;

  return (
    <View style={{ flex: 1 }}>
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
            onPreview={onPreviewSample}
            onLoadAll={handleLoadAllSamples}
            isLoading={isLoading}
            testID="sample-files-table"
          />

          <UploadStatusCard
            sourceFile={sourceFileInfo}
            targetFile={targetFileInfo}
            mappingFile={mappingFileInfo}
          />

          <View className="flex-row items-center justify-center gap-3 pt-2">
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
              Continue to Type Mapping  →
            </Button>
          </View>
        </View>
      </View>
    </Screen>

    {/* Preview Modal — outside Screen to avoid ScrollView nesting issues */}
    <Modal visible={isPreviewOpen} transparent animationType="fade" onRequestClose={closePreview}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={closePreview}>
        <Pressable
          className="bg-background rounded-xl border border-border w-full max-w-4xl max-h-[80%]"
          onPress={() => {}}
        >
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Eye size={18} color={colors.foreground} />
              <Text className="font-heading text-base font-semibold text-foreground">
                {previewTitle}
              </Text>
            </View>
            <Pressable onPress={closePreview} accessibilityLabel="Close preview" testID="preview-close">
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text className="px-4 py-1 text-xs text-muted-foreground">
            Showing {previewData?.length ?? 0} rows
          </Text>
          <ScrollView horizontal className="flex-1 px-4 pb-4">
            <View>
              {previewData && previewData.length > 0 && (
                <>
                  <View className="flex-row border-b border-border py-2">
                    {Object.keys(previewData[0]!).map((col) => (
                      <Text key={col} className="w-40 px-2 font-mono text-xs font-semibold text-foreground">
                        {col}
                      </Text>
                    ))}
                  </View>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {previewData.map((row, i) => (
                      <View key={i} className="flex-row border-b border-border/50 py-1.5">
                        {Object.values(row).map((val, j) => (
                          <Text key={j} className="w-40 px-2 font-mono text-xs text-muted-foreground">
                            {String(val ?? '')}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}
              {(!previewData || previewData.length === 0) && (
                <View className="py-8 items-center">
                  <Text className="text-sm text-muted-foreground">No data to preview</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </View>
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
                ? 'border-green-200 bg-green-50'
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
                item.file !== null ? 'text-green-800' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Text>
            {item.file !== null && (
              <Text className="font-mono text-xs text-green-700">
                {item.file.rowCount} {item.unit}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
