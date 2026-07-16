import { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import {
  selectCurrentStep,
  selectSourceERP,
  selectTargetERP,
  selectEffectiveSourceFile,
  selectEffectiveTargetFile,
  selectEffectiveMappingFile,
} from '../store/migration.selectors';
import {
  handleFileUpload,
  extractAccountTypes,
  buildTypeMappingRows,
  triggerBlobDownload,
} from '../services/file-processing.service';
import { matchTypesToTargets } from '../services/fuzzy.service';
import { downloadSampleData, getSampleData } from '@/features/erp-config/services/erp-config.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { useSyncStep } from './useSyncStep';
import { useToast } from '@/shared/hooks/useToast';
import { isWeb } from '@/shared/utils/platform.utils';
import { STEP_TO_SCREEN } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';
import type { MigrationStackParamList } from '@/navigation/types';
import type { ERPSystem } from '../types/erp.types';
import type { UploadedFile } from '../types/migration.types';
import type { AppError } from '@/shared/types/result.types';
import type { PickedFile } from './useFileUpload';

interface UseMigrationViewModelReturn {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly sourceERP: ERPSystem | null;
  readonly targetERP: ERPSystem | null;
  readonly sourceFile: UploadedFile | null;
  readonly targetFile: UploadedFile | null;
  readonly mappingFile: UploadedFile | null;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly goToStep: (step: number) => void;
  readonly handleSourceSelect: (id: string, list: ERPSystem[]) => void;
  readonly handleTargetSelect: (id: string, list: ERPSystem[]) => void;
  readonly canProceedFromStep0: boolean;
  readonly handleSourceFilePicked: (file: PickedFile) => Promise<void>;
  readonly handleTargetFilePicked: (file: PickedFile) => Promise<void>;
  readonly handleMappingFilePicked: (file: PickedFile) => Promise<void>;
  readonly handleRemoveSourceFile: () => void;
  readonly handleRemoveTargetFile: () => void;
  readonly handleRemoveMappingFile: () => void;
  readonly processFiles: () => Promise<void>;
  readonly canProceedFromStep1: boolean;
  readonly handleDownloadSample: (erpId: string) => Promise<void>;
  readonly handlePreviewSample: (erpId: string) => Promise<void>;
  readonly previewData: Record<string, unknown>[] | null;
  readonly previewTitle: string;
  readonly isPreviewOpen: boolean;
  readonly closePreview: () => void;
}

export function useMigrationViewModel(): UseMigrationViewModelReturn {
  const navigation = useNavigation<NativeStackNavigationProp<MigrationStackParamList>>();
  const currentStep = useMigrationStore(selectCurrentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const sourceERP = useMigrationStore(selectSourceERP);
  const targetERP = useMigrationStore(selectTargetERP);
  const sourceFile = useMigrationStore(selectEffectiveSourceFile);
  const targetFile = useMigrationStore(selectEffectiveTargetFile);
  const mappingFile = useMigrationStore(selectEffectiveMappingFile);
  const isLoading = useMigrationStore((s) => s.isLoading);
  const error = useMigrationStore((s) => s.error);
  const projectId = useMigrationStore((s) => s.projectId);
  const sourceData = useMigrationStore((s) => s.sourceData);
  const targetData = useMigrationStore((s) => s.targetData);
  const mappingData = useMigrationStore((s) => s.mappingData);

  const actions = useMigrationStore(useShallow((s) => ({
    setStep: s.setStep,
    completeStep: s.completeStep,
    setSourceERP: s.setSourceERP,
    setTargetERP: s.setTargetERP,
    clearTargetERP: s.clearTargetERP,
    setSourceData: s.setSourceData,
    setTargetData: s.setTargetData,
    setMappingData: s.setMappingData,
    clearSourceFile: s.clearSourceFile,
    clearTargetFile: s.clearTargetFile,
    clearMappingFile: s.clearMappingFile,
    setTargetTypes: s.setTargetTypes,
    hydrateTypeMappingRows: s.hydrateTypeMappingRows,
    setLoading: s.setLoading,
    setError: s.setError,
  })));
  const syncStep = useSyncStep();
  const { showSuccess, showError } = useToast();

  const goToStep = useCallback((step: number): void => {
    actions.setStep(step);
    syncStep(step);
    const screen = STEP_TO_SCREEN[step as MigrationStepValue];
    if (screen && screen !== 'MigrationList') {
      const navState = navigation.getState();
      const currentRoute = navState?.routes[navState.index];
      const pid = projectId ?? (currentRoute?.params as { projectId?: string } | undefined)?.projectId;
      if (pid) {
        navigation.navigate(screen as 'ERPSelect', { projectId: pid });
      }
    }
  }, [actions, syncStep, navigation, projectId]);

  const handleSourceSelect = useCallback((erpId: string, erpSystems: ERPSystem[]): void => {
    const erp = erpSystems.find((e) => e.id === erpId);
    if (!erp) return;
    actions.setSourceERP(erp);
    if (targetERP?.id === erpId) actions.clearTargetERP();
  }, [actions, targetERP?.id]);
  const handleTargetSelect = useCallback((erpId: string, erpSystems: ERPSystem[]): void => {
    const erp = erpSystems.find((e) => e.id === erpId);
    if (!erp) return;
    actions.setTargetERP(erp);
  }, [actions]);
  const pid = projectId ?? undefined;
  const cbs = { setLoading: actions.setLoading, setError: actions.setError, showSuccess, showError };
  const handleSourceFilePicked = useCallback(
    async (file: PickedFile): Promise<void> => {
      await handleFileUpload(httpClient, file,
        { sourceErp: sourceERP?.id, fileName: file.name, projectId: pid, fileType: 'sourcecoa' },
        { ...cbs, setData: actions.setSourceData }, 'Source file');
    },
    [actions, sourceERP?.id, pid, showSuccess, showError],
  );
  const handleTargetFilePicked = useCallback(
    async (file: PickedFile): Promise<void> => {
      await handleFileUpload(httpClient, file,
        { targetErp: targetERP?.id, fileName: file.name, projectId: pid, fileType: 'targetcoa' },
        { ...cbs, setData: actions.setTargetData }, 'Target file');
    },
    [actions, targetERP?.id, pid, showSuccess, showError],
  );
  const handleMappingFilePicked = useCallback(
    async (file: PickedFile): Promise<void> => {
      await handleFileUpload(httpClient, file,
        { fileName: file.name, projectId: pid, fileType: 'typemapping' },
        { ...cbs, setData: actions.setMappingData }, 'Mapping file');
    },
    [actions, pid, showSuccess, showError],
  );
  const handleRemoveSourceFile = useCallback((): void => actions.clearSourceFile(), [actions]);
  const handleRemoveTargetFile = useCallback((): void => actions.clearTargetFile(), [actions]);
  const handleRemoveMappingFile = useCallback((): void => actions.clearMappingFile(), [actions]);

  const processFiles = useCallback(async (): Promise<void> => {
    if (!sourceFile) {
      showError('Missing file', 'Please upload a source file before proceeding');
      return;
    }
    actions.setLoading(true);
    try {
      const extractedTargetTypes = targetData.length > 0
        ? extractAccountTypes(targetData)
        : [];
      if (extractedTargetTypes.length > 0) {
        actions.setTargetTypes(extractedTargetTypes);
      }

      // Hydration path — rows are derived from the uploaded file(s), not
      // user edits to the mapping table. Don't mark dirty: only explicit
      // edits in MappingScreen (updateTypeMappingRow / addTypeMappingRow /
      // deleteTypeMappingRow) should flip hasUnsavedTypeMappings.
      if (mappingData.length > 0) {
        actions.hydrateTypeMappingRows(buildTypeMappingRows(mappingData));
      } else {
        const sourceTypes = extractAccountTypes(sourceData);
        if (sourceTypes.length > 0) {
          const rows = matchTypesToTargets(sourceTypes, extractedTargetTypes);
          actions.hydrateTypeMappingRows(rows);
        }
      }

      actions.completeStep(1);
      actions.setStep(2);
      syncStep(2);

      const { workstreamId, projectId } = useMigrationStore.getState();
      if (workstreamId && projectId) {
        httpClient
          .patch(`/api/v1/projects/${projectId}/workstreams/${workstreamId}`, { current_stage: 'Type Mapping' })
          .catch(() => {});
      }
    } finally {
      actions.setLoading(false);
    }
  }, [sourceFile, sourceData, targetData, mappingData, actions, syncStep, showError]);

  const handleDownloadSample = useCallback(
    async (erpId: string): Promise<void> => {
      actions.setLoading(true);
      try {
        const result = await downloadSampleData(httpClient, erpId);
        if (result.ok) {
          if (isWeb) {
            triggerBlobDownload(result.data, `${erpId}-sample.xlsx`);
            showSuccess('Download complete', 'Sample file downloaded');
          } else {
            showSuccess('Download unavailable', 'File download is only available on web');
          }
        } else {
          showError('Download failed', result.error.message);
        }
      } catch {
        showError('Download failed', 'An unexpected error occurred');
      } finally {
        actions.setLoading(false);
      }
    },
    [actions, showSuccess, showError],
  );

  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewSample = useCallback(
    async (erpId: string): Promise<void> => {
      actions.setLoading(true);
      try {
        const result = await getSampleData(httpClient, erpId);
        if (result.ok) {
          setPreviewData([...result.data.data]);
          setPreviewTitle(`${result.data.erpName} Sample Data`);
          setIsPreviewOpen(true);
        } else {
          showError('Preview failed', result.error.message);
        }
      } catch {
        showError('Preview failed', 'An unexpected error occurred');
      } finally {
        actions.setLoading(false);
      }
    },
    [actions, showError],
  );

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewData(null);
    setPreviewTitle('');
  }, []);

  const canProceedFromStep0 = useMemo(() => sourceERP !== null && targetERP !== null, [sourceERP, targetERP]);
  const canProceedFromStep1 = useMemo(() => sourceFile !== null && targetFile !== null, [sourceFile, targetFile]);

  return {
    currentStep, completedSteps, sourceERP, targetERP,
    sourceFile, targetFile, mappingFile, isLoading, error,
    goToStep, handleSourceSelect, handleTargetSelect, canProceedFromStep0,
    handleSourceFilePicked, handleTargetFilePicked, handleMappingFilePicked,
    handleRemoveSourceFile, handleRemoveTargetFile, handleRemoveMappingFile,
    processFiles, canProceedFromStep1, handleDownloadSample,
    handlePreviewSample, previewData, previewTitle, isPreviewOpen, closePreview,
  };
}
