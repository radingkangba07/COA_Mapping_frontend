import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMigrationStore } from '../store/migration.store';
import {
  selectCurrentStep,
  selectSourceERP,
  selectTargetERP,
  selectUploadedFiles,
} from '../store/migration.selectors';
import {
  handleFileUpload,
  extractTargetTypes,
  buildTypeMappingRows,
  triggerBlobDownload,
} from '../services/file-processing.service';
import { downloadSampleData } from '@/features/erp-config/services/erp-config.service';
import { httpClient } from '@/shared/services/http/http.instance';
import { useToast } from '@/shared/hooks/useToast';
import { isWeb } from '@/shared/utils/platform.utils';
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
}

export function useMigrationViewModel(): UseMigrationViewModelReturn {
  const currentStep = useMigrationStore(selectCurrentStep);
  const completedSteps = useMigrationStore((s) => s.completedSteps);
  const sourceERP = useMigrationStore(selectSourceERP);
  const targetERP = useMigrationStore(selectTargetERP);
  const { sourceFile, targetFile, mappingFile } = useMigrationStore(selectUploadedFiles);
  const isLoading = useMigrationStore((s) => s.isLoading);
  const error = useMigrationStore((s) => s.error);
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
    setTypeMappingRows: s.setTypeMappingRows,
    setLoading: s.setLoading,
    setError: s.setError,
  })));
  const { showSuccess, showError } = useToast();

  const goToStep = useCallback((step: number): void => {
    actions.setStep(step);
  }, [actions]);

  const handleSourceSelect = useCallback(
    (erpId: string, erpSystems: ERPSystem[]): void => {
      const erp = erpSystems.find((e) => e.id === erpId);
      if (!erp) return;
      actions.setSourceERP(erp);
      if (targetERP?.id === erpId) {
        actions.clearTargetERP();
      }
    },
    [actions, targetERP?.id],
  );
  const handleTargetSelect = useCallback(
    (erpId: string, erpSystems: ERPSystem[]): void => {
      const erp = erpSystems.find((e) => e.id === erpId);
      if (!erp) return;
      actions.setTargetERP(erp);
    },
    [actions],
  );
  const handleSourceFilePicked = useCallback(
    async (file: PickedFile): Promise<void> => {
      await handleFileUpload(httpClient, file,
        { sourceErp: sourceERP?.id, fileName: file.name },
        { setLoading: actions.setLoading, setError: actions.setError,
          setData: actions.setSourceData, showSuccess, showError },
        'Source file',
      );
    },
    [actions, sourceERP?.id, showSuccess, showError],
  );
  const handleTargetFilePicked = useCallback(
    async (file: PickedFile): Promise<void> => {
      await handleFileUpload(httpClient, file,
        { targetErp: targetERP?.id, fileName: file.name },
        { setLoading: actions.setLoading, setError: actions.setError,
          setData: actions.setTargetData, showSuccess, showError },
        'Target file',
      );
    },
    [actions, targetERP?.id, showSuccess, showError],
  );
  const handleMappingFilePicked = useCallback(
    async (file: PickedFile): Promise<void> => {
      await handleFileUpload(httpClient, file,
        { fileName: file.name },
        { setLoading: actions.setLoading, setError: actions.setError,
          setData: actions.setMappingData, showSuccess, showError },
        'Mapping file',
      );
    },
    [actions, showSuccess, showError],
  );
  const handleRemoveSourceFile = useCallback((): void => {
    actions.clearSourceFile();
  }, [actions]);
  const handleRemoveTargetFile = useCallback((): void => {
    actions.clearTargetFile();
  }, [actions]);
  const handleRemoveMappingFile = useCallback((): void => {
    actions.clearMappingFile();
  }, [actions]);

  const processFiles = useCallback(async (): Promise<void> => {
    if (!sourceFile) {
      showError('Missing file', 'Please upload a source file before proceeding');
      return;
    }
    actions.setLoading(true);
    try {
      if (targetData.length > 0) {
        actions.setTargetTypes(extractTargetTypes(targetData));
      }
      if (mappingData.length > 0) {
        actions.setTypeMappingRows(buildTypeMappingRows(mappingData));
      }
      actions.completeStep(1);
      actions.setStep(2);
    } finally {
      actions.setLoading(false);
    }
  }, [sourceFile, targetData, mappingData, actions, showError]);

  const handleDownloadSample = useCallback(
    async (erpId: string): Promise<void> => {
      actions.setLoading(true);
      try {
        const result = await downloadSampleData(httpClient, erpId);
        if (result.ok) {
          if (isWeb) { triggerBlobDownload(result.data, `${erpId}-sample.xlsx`); }
          showSuccess('Download complete', 'Sample file downloaded');
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

  const canProceedFromStep0 = useMemo(
    (): boolean => sourceERP !== null && targetERP !== null,
    [sourceERP, targetERP],
  );
  const canProceedFromStep1 = useMemo((): boolean => sourceFile !== null, [sourceFile]);

  return {
    currentStep, completedSteps, sourceERP, targetERP,
    sourceFile, targetFile, mappingFile, isLoading, error,
    goToStep, handleSourceSelect, handleTargetSelect, canProceedFromStep0,
    handleSourceFilePicked, handleTargetFilePicked, handleMappingFilePicked,
    handleRemoveSourceFile, handleRemoveTargetFile, handleRemoveMappingFile,
    processFiles, canProceedFromStep1, handleDownloadSample,
  };
}
