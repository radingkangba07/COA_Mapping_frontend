import React, { useCallback, useEffect, useState } from 'react';
import {View, Text, ScrollView,} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutTemplate, File as FileIcon, ArrowLeft, ArrowRight } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ProjectsStackParamList } from '@/navigation/types';
import { isWeb } from '@/shared/utils/platform.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { MigrationLayout } from '@/features/migration/components/MigrationLayout';
import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { createProjectId } from '@/shared/types/common.types';
import { useEntityPack } from '../hooks/useEntityPack';
import { useSourceFileUpload } from '../hooks/useSourceFileUpload';
import { useWizardStore } from '../store/wizard.store';
import { STEPS } from '../dp-kit/react/taxonomy';
import { toStepRail } from '../mappers/toStepRail';
import { StepRail } from '@/shared/components/ui/StepRail';
import { parseCSV } from '../utils/csv';
import { missingColumns } from '../utils/columnCheck';
import { colors } from '@/config/theme';
import type { StepId } from '../types/wizard.types';
import type { EntityId } from '../types/entity-pack.types';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { FileUploadField, FileTargetCard, type UploadedFile } from '@/shared/components/ui/FileUploader';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { SampleFileCard } from '@/shared/components/ui/SampleFileCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadRoute = RouteProp<ProjectsStackParamList, 'MasterDataUpload'>;
type UploadNav = NativeStackNavigationProp<ProjectsStackParamList, 'MasterDataUpload'>;

// ─── Static entity sample fallbacks ─────────────────────────────────────────
// Used when the backend entity profile endpoint has not yet returned sample data.

const ENTITY_SAMPLE: Record<string, { name: string; description: string; content: string }> = {
  customers: {
    name: 'Source Customers Sample',
    description: 'Sample customer master data for a source ERP',
    content: [
      'Account No,Customer Name,VAT No,Email,Payment Terms,Currency,Credit Limit',
      'C-10045,Roboweeder Pty Ltd,4210192837,ap@roboweeder.co.za,Net 30,ZAR,250000.00',
      'C-10046,Acme Trading CC,4980112233,sales@acme.com,COD,ZAR,50000.00',
      'C-10047,Northwind Supplies,4771122334,info@northwind.co.za,30d,ZAR,75000.00',
      'C-10048,Baltic Imports BV,,accounts@baltic.eu,Net 60,EUR,120000.00',
      'C-10049,Summit Hardware,4661234567,,2/10 N30,ZAR,',
      'C-10050,Delta Logistics,4559876543,ar@deltalog.co.za,Immediate,USD,30000.00',
    ].join('\n'),
  },
  items: {
    name: 'Source Items Sample',
    description: 'Sample item master data for a source ERP',
    content: [
      'Item Code,Item Name,Category,Unit Price,Currency,Tax Code,Active',
      'ITM-001,Office Chair,Furniture,1200.00,ZAR,VAT15,true',
      'ITM-002,Laptop Stand,Electronics,350.00,ZAR,VAT15,true',
      'ITM-003,Notebook A4,Stationery,25.00,ZAR,VAT15,true',
      'ITM-004,Desk Lamp,Furniture,180.00,ZAR,VAT15,true',
      'ITM-005,USB Hub,Electronics,220.00,USD,VAT15,true',
      'ITM-006,Filing Cabinet,Furniture,850.00,ZAR,VAT15,false',
    ].join('\n'),
  },
};

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function MasterDataUploadScreen(): React.JSX.Element {
  const route = useRoute<UploadRoute>();
  const navigation = useNavigation<UploadNav>();
  const { orgProjectId, entityId, parentProjectId } = route.params;

  const { pack, refetch: refetchPack } = useEntityPack(orgProjectId, entityId);
  const {
    upload: uploadSourceFileToServer,
    result: uploadResult,
    isUploading,
    error: uploadError,
    reset: resetUpload,
  } = useSourceFileUpload({ orgProjectId, fileType: 'source_erp' });
  const setUploadedFile = useWizardStore((s) => s.setUploadedFile);
  const clearUploadedFile = useWizardStore((s) => s.clearUploadedFile);
  const { project, isLoading: isProjectLoading, isFetching: isProjectFetching, error: projectError, refetch: refetchProject } = useProjectDetail(createProjectId(parentProjectId));
  // The entity-pack profile fetch is deliberately excluded from this gate:
  // the backend has no GET /projects/{id}/entities/{id}/profile route yet,
  // so `pack` is treated as optional everywhere below (spec ?? {}, pack?.*,
  // ENTITY_SAMPLE fallback) rather than blocking Step 1 on a 404.
  const hydrationError = projectError;
  // TanStack Query's `isLoading` is only true on the very first fetch (it's
  // `isPending && isFetching`, and `isPending` goes false forever once a
  // query first settles). Once an error has been hit, a retry only flips
  // `isFetching` — so fold that in here, but only while an error is present,
  // to avoid the spinner flashing on ordinary background refetches.
  const isHydrating = isProjectLoading
    || (hydrationError !== null && isProjectFetching);
  const retryHydration = useCallback((): void => {
    refetchPack();
    refetchProject();
  }, [refetchPack, refetchProject]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const MAX_PREVIEW = 8;

  const uploadStep = STEPS.find(s => s.id === 'upload')!;
  const profileStep = STEPS.find(s => s.id === 'profile')!;
  const stepRail = toStepRail(uploadStep.id as StepId, STEPS);

  const header = csvRows[0] ?? [];
  const dataRows = Math.max(0, csvRows.length - 1);
  const hasFile = fileName !== null;
  const spec = pack?.spec ?? {};
  const expectedCols = spec.expectedColumns ?? [];
  const columnWarning = hasFile && expectedCols.length > 0
    ? missingColumns(header, expectedCols)
    : [];

  const targetErpInfo = pack?.target.record
    ? { name: pack.target.record, record: spec.targetNote ?? pack.target.record }
    : {
      name: (() => { const e = getERPById(project?.targetErp ?? ''); return e?.name ?? (toTitleCase((project?.targetErp ?? '').replace(/_/g, ' ')) || '—'); })(),
      record: pack?.target.record ?? '',
    };

  const entityLabel = pack?.label.plural ?? entityId.charAt(0).toUpperCase() + entityId.slice(1);

  const fallbackSample = ENTITY_SAMPLE[entityId.toLowerCase()];
  const sampleContent = spec.sample?.content ?? fallbackSample?.content ?? null;
  const sampleName = spec.sample?.name ?? fallbackSample?.name ?? `Source ${entityLabel} Sample`;
  const sampleDesc = spec.sample?.description ?? fallbackSample?.description ?? `Sample ${entityLabel.toLowerCase()} master data for a source ERP`;

  // ── CSV loading ─────────────────────────────────────────────────────────────

  const loadContent = useCallback((content: string, name: string): void => {
    const rows = parseCSV(content);
    setFileName(name);
    setCsvRows(rows);
    setShowPreview(true);
  }, []);

  const handleFilePicked = useCallback((file: UploadedFile): void => {
    if (file instanceof File) {
      void file.text().then((content) => loadContent(content, file.name));
    } else {
      void FileSystem.readAsStringAsync(file.uri).then((content) =>
        loadContent(content, file.name),
      );
    }
    // A previously confirmed fileId belongs to the file being replaced —
    // drop it now so a stale id can never be read while this new upload is
    // still in flight (or if it fails).
    clearUploadedFile(entityId as EntityId);
    uploadSourceFileToServer(file);
  }, [loadContent, uploadSourceFileToServer, clearUploadedFile, entityId]);

  // The single point where a backend-confirmed upload becomes part of wizard
  // state — mirrors is the source of truth for later steps, never the local
  // CSV preview parsed in loadContent (which the server never sees).
  useEffect(() => {
    if (uploadResult) {
      setUploadedFile(entityId as EntityId, uploadResult);
    }
  }, [uploadResult, entityId, setUploadedFile]);

  const handleRemove = useCallback((): void => {
    setFileName(null);
    setCsvRows([]);
    setShowPreview(false);
    resetUpload();
    clearUploadedFile(entityId as EntityId);
  }, [resetUpload, clearUploadedFile, entityId]);

  const handleLoadSample = useCallback((): void => {
    if (!sampleContent) return;
    loadContent(sampleContent, `${entityId}-sample.csv`);
  }, [sampleContent, entityId, loadContent]);

  const handleDownloadSample = useCallback(async (): Promise<void> => {
    if (!sampleContent) return;
    const name = `${entityId}-sample.csv`;
    if (isWeb) {
      const blob = new Blob([sampleContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } else {
      const path = `${FileSystem.documentDirectory ?? ''}${name}`;
      await FileSystem.writeAsStringAsync(path, sampleContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path);
    }
  }, [sampleContent, entityId]);

  const handleBack = useCallback((): void => { navigation.goBack(); }, [navigation]);
  // A real stack navigation (not a local content swap) — this is what keeps
  // MigrationLayout's sidebar and the stack's own navigation state in sync
  // with the step actually on screen. See SourceDataProfileScreen.tsx's
  // route/navigation props, which is what wraps it in MigrationLayout.
  const handleContinue = useCallback((): void => {
    navigation.navigate('MasterDataProfile', { orgProjectId, entityId, parentProjectId });
  }, [navigation, orgProjectId, entityId, parentProjectId]);

  const stepCounter = `Step ${uploadStep.n} of ${STEPS.length}`;
  const continueLabel = `Continue to ${profileStep.label}`;
  const fileLine = hasFile
    ? `${fileName ?? ''} · ${dataRows} rows`
    : `No source ${entityId} file selected`;

  const targetErpKey = (project?.targetErp ?? '').toLowerCase();
  const erpInfo = getERPById(targetErpKey);
  const erpBadge = erpInfo
    ? { bg: erpInfo.brandColor, fg: colors.primaryForeground }
    : undefined;
  const erpInitial = targetErpInfo.name.slice(0, 2).toUpperCase();

  if (isHydrating) {
    return (
      <MigrationLayout title="DataPortation" projectId={parentProjectId} onBack={handleBack} testID="master-data-upload-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </MigrationLayout>
    );
  }

  if (hydrationError) {
    return (
      <MigrationLayout title="DataPortation" projectId={parentProjectId} onBack={handleBack} testID="master-data-upload-screen">
        <NetworkErrorFallback error={new Error(hydrationError.message)} onRetry={retryHydration} testID="master-data-upload-error" />
      </MigrationLayout>
    );
  }
  return (
    <MigrationLayout
      title="DataPortation"
      projectId={parentProjectId}
      onBack={handleBack}
      testID="master-data-upload-screen"
      sourceRowCount={hasFile ? dataRows : undefined}
    >
      <View className="flex-1 flex-col bg-background">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">

          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} />

          {/* ── Page header ────────────────────────────────────────────── */}
          <View className="mt-8 mb-5 flex-row items-start gap-4 flex-wrap bg-card">
            <View className="flex-1 gap-2">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-lg font-bold tracking-tight font-heading text-foreground">{uploadStep.label}</Text>
                <Text className="text-xs font-body text-muted-foreground">{stepCounter}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <FileIcon size={14} color={colors.mutedForeground} strokeWidth={2} />
                <Text className="text-xs font-mono text-muted-foreground" numberOfLines={1}>{fileLine}</Text>
              </View>
            </View>
            <View className="flex-row items-end gap-2">
              <View className="flex-row items-center justify-center align-center gap-3">
                <Button
                  variant="outline"
                  onPress={handleBack}
                  testID="upload-back-button"
                >
                  <ArrowLeft size={16} color={colors.foreground} />
                  <Text className="font-body text-sm font-medium text-foreground ml-1">
                    Back
                  </Text>
                </Button>
                <Button
                  onPress={() => void handleContinue()}
                  disabled={!hasFile || isUploading || !uploadResult || Boolean(uploadError)}
                  testID="upload-continue-button"
                >
                  <Text className="font-body text-sm font-medium text-primary-foreground mr-1">
                    {isUploading ? 'Uploading…' : uploadError ? 'Upload failed — retry' : continueLabel}
                  </Text>
                  <ArrowRight size={16} color={colors.primaryForeground} />

                </Button>
              </View>
            </View>
          </View>


          {/* ── Main panel ───────────────────────────────────────────── */}
          <View className="border border-border rounded-xl p-5 self-stretch">
            <View className="flex-col gap-6 flex-wrap md:flex-row">
              <FileUploadField
                label={
                  <>
                    {'1. Source '}
                    <Text className="text-foreground">{entityLabel}</Text>
                    {': Master Data '}
                    <Text className="text-destructive">*</Text>
                  </>
                }
                subLabel="Upload a source CSV to continue"
                hasFile={hasFile}
                fileName={fileName}
                rowCount={dataRows}
                tagClassName="bg-chip text-chip-foreground"
                expectedColumns={expectedCols}
                columnWarning={columnWarning}
                showPreview={showPreview}
                onFilePicked={handleFilePicked}
                onTogglePreview={() => setShowPreview(p => !p)}
                onRemove={handleRemove}
                testID="master-data-upload-dropzone"
              />
              <FileTargetCard
                label="2. Target System Format"
                subLabel="Set when the project was created"
                badgeText={erpInitial}
                badgeTone={erpBadge}
                title={targetErpInfo.name}
                subtitle={targetErpInfo.record}
                description={`The uploaded ${entityLabel.toLowerCase()} data will be converted into this system's format. To change the target, edit the project settings.`}
              />
            </View>

            {/* Sample file row — always visible */}
            <SampleFileCard
              sampleName={sampleName}
              sampleDesc={sampleDesc}
              onLoad={handleLoadSample}
              onDownload={() => void handleDownloadSample()}
            />
          </View>

          {/* Source file preview */}
          {hasFile && showPreview && (
            <View className="border rounded-xl overflow-hidden self-stretch mt-8 bg-card border-border">
              <View className="flex-row items-center gap-3 flex-wrap p-4">
                <LayoutTemplate size={17} color={colors.primary} strokeWidth={1.8} />
                <Text className="text-base font-bold font-heading text-foreground">Source File Preview</Text>
                <View className="border rounded-full px-3 py-1 border-border">
                  <Text className="text-xs font-mono text-muted-foreground">
                    {`first ${Math.min(MAX_PREVIEW, dataRows)} of ${dataRows} rows`}
                  </Text>
                </View>
              </View>
              <Text className="text-xs px-4 mb-2 font-body text-muted-foreground">
                Check the header row and a few sample values before continuing. Column names are matched to target fields in the next step.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="flex-grow">
                <View className="flex-1">
                  <View className="flex-row border-b bg-surface border-b-border">
                    <View className="w-14 shrink-0 px-3 py-3">
                      <Text className="text-xs font-bold uppercase tracking-wider font-body text-muted-foreground">SRC #</Text>
                    </View>
                    {header.map((col, i) => (
                      <View key={i} className="flex-1 px-3 py-3">
                        <Text className="text-xs font-bold uppercase tracking-wider font-body text-muted-foreground" numberOfLines={1}>{col}</Text>
                      </View>
                    ))}
                  </View>
                  {csvRows.slice(1, 1 + MAX_PREVIEW).map((row, ri) => (
                    <View key={ri} className="flex-row border-b border-b-border">
                      <View className="w-14 shrink-0 px-3 py-3">
                        <Text className="text-xs font-mono text-muted-foreground">{ri + 1}</Text>
                      </View>
                      {row.map((cell, ci) => (
                        <View key={ci} className="flex-1 px-3 py-3">
                          <Text className="text-xs font-mono text-foreground" numberOfLines={1}>{cell}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <Text className="text-xs py-1 font-mono text-muted-foreground">
            {hasFile
              ? `${fileName ?? ''} → ${targetErpInfo.name}`
              : `Waiting for a source ${(pack?.label.singular ?? entityId).toLowerCase()} file…`}
          </Text>
        </ScrollView>
      </View>
    </MigrationLayout>
  );
}
