import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle, Circle, Eye, Info, X } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { Spinner } from '@/shared/components/ui/Spinner';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { MigrationLayout } from '../components/MigrationLayout';
import { MigrationStepper } from '../components/MigrationStepper/MigrationStepper';
import { FileUploader } from '../components/FileUploader/FileUploader';
import { SampleFilesTable } from '../components/SampleFilesTable';
import { FetchFromErpStep } from '../components/FetchFromErpStep/FetchFromErpStep';
import { useMigrationViewModel } from '../hooks/useMigrationViewModel';
import { useFetchFromErp } from '../hooks/useFetchFromErp';
import { useMigrationStore } from '../store/migration.store';
import { useHydrateProject } from '../hooks/useHydrateProject';
import { useMigrationScreenRoute } from '@/navigation/types';
import { createProjectId } from '@/shared/types/common.types';
import { colors } from '@/config/theme';
import type { MigrationStackParamList } from '@/navigation/types';
import type { PickedFile } from '../hooks/useFileUpload';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';
import { useToast } from '@/shared/hooks/useToast';

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

  const clearPendingRemovals = useMigrationStore((s) => s.clearPendingRemovals);

  useEffect(() => {
    clearPendingRemovals();
  }, [clearPendingRemovals]);

  const {
    currentStep, completedSteps, sourceERP, targetERP,
    sourceFile, targetFile, mappingFile, isLoading, canProceedFromStep1,
    goToStep, handleSourceFilePicked, handleTargetFilePicked, handleMappingFilePicked,
    handleRemoveSourceFile, handleRemoveTargetFile, handleRemoveMappingFile,
    processFiles, handleDownloadSample,
    handlePreviewSample, previewData, previewTitle, isPreviewOpen, closePreview,
  } = useMigrationViewModel();

  const {
    method, connectionReady, sourceErpName, targetErpName, fetch, runFetch, refetch, useCsvFallback,
  } = useFetchFromErp();

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

  const sourceData = useMigrationStore((s) => s.sourceData);
  const targetData = useMigrationStore((s) => s.targetData);
  const mappingData = useMigrationStore((s) => s.mappingData);

  const [filePreviewData, setFilePreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [filePreviewTitle, setFilePreviewTitle] = useState('');
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);

  const openFilePreview = useCallback((data: Record<string, unknown>[], title: string): void => {
    setFilePreviewData(data);
    setFilePreviewTitle(title);
    setIsFilePreviewOpen(true);
  }, []);

  const closeFilePreview = useCallback((): void => {
    setIsFilePreviewOpen(false);
    setFilePreviewData(null);
    setFilePreviewTitle('');
  }, []);

  const onSourcePreview = useCallback((): void => {
    if (sourceData.length > 0) openFilePreview(sourceData, `Source COA — ${sourceFile?.name ?? ''}`);
  }, [sourceData, sourceFile?.name, openFilePreview]);

  const onTargetPreview = useCallback((): void => {
    if (targetData.length > 0) openFilePreview(targetData, `Target COA — ${targetFile?.name ?? ''}`);
  }, [targetData, targetFile?.name, openFilePreview]);

  const onMappingPreview = useCallback((): void => {
    if (mappingData.length > 0) openFilePreview(mappingData, `Type Mapping — ${mappingFile?.name ?? ''}`);
  }, [mappingData, mappingFile?.name, openFilePreview]);

  const handleGoBack = useCallback((): void => {
    navigation.goBack();
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
      <MigrationLayout title="DataPortation" projectId={projectId} onBack={handleGoBack} testID="upload-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </MigrationLayout>
    );
  }

  if (error) {
    return (
      <MigrationLayout title="DataPortation" projectId={projectId} onBack={handleGoBack} testID="upload-screen">
        <NetworkErrorFallback error={new Error(error.message)} onRetry={retry} testID="upload-error" />
      </MigrationLayout>
    );
  }

  const sourceFileInfo = sourceFile ? { name: sourceFile.name, rowCount: sourceFile.rowCount } : null;
  const targetFileInfo = targetFile ? { name: targetFile.name, rowCount: targetFile.rowCount } : null;
  const mappingFileInfo = mappingFile ? { name: mappingFile.name, rowCount: mappingFile.rowCount } : null;

  return (
    <View style={{ flex: 1 }}>
    <MigrationLayout
      title="DataPortation"
      subtitle="Upload your chart of accounts files"
      projectId={projectId}
      onBack={handleGoBack}
      scroll
      testID="upload-screen"
    >
      <View className="flex-1 max-w-5xl lg:max-w-6xl self-center w-full py-4 gap-4">
        <View className="flex-1 gap-4">
          <MigrationStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepPress={(step: number) => {
              useMigrationStore.getState().setStep(step);
              const screen = STEP_TO_SCREEN[step as MigrationStepValue];
              navigation.navigate(screen as 'ERPSelect', { projectId });
            }}
          />

          {/* Title */}
          <View className="gap-0.5">
            <Text className="font-heading text-lg font-bold text-foreground" testID="upload-screen-title">
              Upload COA Files
            </Text>
            <Text className="font-body text-sm text-muted-foreground">
              Upload your source COA, target COA, and optional account type mapping
            </Text>
          </View>

          {/* Single card: ERP info + File upload + Sample files */}
          <Card testID="upload-files-card">
            <Card.Content className="gap-0">
              {sourceERP && targetERP ? (
                <View testID="upload-erp-summary" className="flex-row items-center gap-1.5 rounded-md px-3 py-2 mb-4" style={{ backgroundColor: 'rgba(0,51,153,0.05)' }}>
                  <Info size={14} color="#003399" />
                  <Text className="font-body text-sm text-muted-foreground">
                    Migrating from <Text className="font-medium" style={{ color: '#003399' }}>{sourceERP.name}</Text>
                    {' → '}
                    <Text className="font-medium" style={{ color: '#003399' }}>{targetERP.name}</Text>
                  </Text>
                </View>
              ) : null}
              {method === 'mcp' ? (
                // DA-52: MCP connection method → fetch COA directly from the ERP.
                <FetchFromErpStep
                  sourceErpName={sourceErpName}
                  targetErpName={targetErpName}
                  connectionReady={connectionReady}
                  status={fetch.status}
                  progress={fetch.progress}
                  counts={fetch.counts}
                  sampleSource={fetch.sampleSource}
                  sampleTarget={fetch.sampleTarget}
                  errorMessage={fetch.errorMessage}
                  onFetch={runFetch}
                  onRefetch={refetch}
                  onUseCsvFallback={useCsvFallback}
                  testID="fetch-from-erp-step"
                />
              ) : (
                // CSV fallback — retained unchanged when method === 'csv'.
                <>
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
                    onSourcePreview={onSourcePreview}
                    onTargetPreview={onTargetPreview}
                    onMappingPreview={onMappingPreview}
                    isUploading={isLoading}
                    testID="upload-file-uploader"
                  />

                  <View className="border-t border-border mt-4 pt-4">
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
                  </View>
                </>
              )}
            </Card.Content>
          </Card>

          <View className="flex-row items-center justify-end gap-3 pt-2">
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
    </MigrationLayout>

    {/* Preview Modal — outside MigrationLayout to avoid ScrollView nesting issues */}
    <Modal visible={isPreviewOpen} transparent animationType="fade" onRequestClose={closePreview}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={closePreview}>
        <Pressable
          className="bg-background rounded-xl border border-border w-full max-w-6xl max-h-[90%]"
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
          <ScrollView style={{ maxHeight: 700 }} className="px-4 pb-4">
            <ScrollView horizontal>
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
                    {previewData.map((row, i) => (
                      <View key={i} className="flex-row border-b border-border/20 py-1.5">
                        {Object.values(row).map((val, j) => (
                          <Text key={j} className="w-40 px-2 font-mono text-xs text-muted-foreground">
                            {String(val ?? '')}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </>
                )}
                {(!previewData || previewData.length === 0) && (
                  <View className="py-8 items-center">
                    <Text className="text-sm text-muted-foreground">No data to preview</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>

    {/* File Preview Modal — for uploaded file data */}
    <Modal visible={isFilePreviewOpen} transparent animationType="fade" onRequestClose={closeFilePreview}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={closeFilePreview}>
        <Pressable
          className="bg-background rounded-xl border border-border w-full max-w-6xl max-h-[90%]"
          onPress={() => {}}
        >
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Eye size={18} color={colors.foreground} />
              <Text className="font-heading text-base font-semibold text-foreground">
                {filePreviewTitle}
              </Text>
            </View>
            <Pressable onPress={closeFilePreview} accessibilityLabel="Close preview" testID="file-preview-close">
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text className="px-4 py-1 text-xs text-muted-foreground">
            Showing {filePreviewData?.length ?? 0} rows
          </Text>
          <ScrollView style={{ maxHeight: 700 }} className="px-4 pb-4">
            <ScrollView horizontal>
              <View>
                {filePreviewData && filePreviewData.length > 0 && (
                  <>
                    <View className="flex-row border-b border-border py-2">
                      {Object.keys(filePreviewData[0]!).map((col) => (
                        <Text key={col} className="w-40 px-2 font-mono text-xs font-semibold text-foreground">
                          {col}
                        </Text>
                      ))}
                    </View>
                    {filePreviewData.map((row, i) => (
                      <View key={i} className="flex-row border-b border-border/20 py-1.5">
                        {Object.values(row).map((val, j) => (
                          <Text key={j} className="w-40 px-2 font-mono text-xs text-muted-foreground">
                            {String(val ?? '')}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </>
                )}
                {(!filePreviewData || filePreviewData.length === 0) && (
                  <View className="py-8 items-center">
                    <Text className="text-sm text-muted-foreground">No data to preview</Text>
                  </View>
                )}
              </View>
            </ScrollView>
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
                item.file !== null ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Text>
            {item.file !== null && (
              <Text className="font-mono text-xs text-muted-foreground">
                {item.file.rowCount} {item.unit}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
