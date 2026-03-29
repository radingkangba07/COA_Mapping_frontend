import { ERP_SYSTEMS } from '@/shared/constants/erp-systems';
import { MIGRATION_STEPS, completedStepsForStep } from '@/shared/constants/migration-steps';
import type { MigrationStepValue } from '@/shared/constants/migration-steps';
import { createFileId } from '@/shared/types/common.types';
import type { ProjectId } from '@/shared/types/common.types';
import type { HttpClient } from '@/shared/services/http/http.types';
import type { AppError } from '@/shared/types/result.types';
import type { ERPSystem } from '@/features/migration/types/erp.types';
import type { MigrationStore } from '../store/migration.store';
import { getProject } from '@/features/projects/services/projects.service';
import { getProjectFiles, getFileData } from './excel.service';
import { getMappings } from './mapping.service';
import { extractAccountTypes, buildTypeMappingRows } from './file-processing.service';

export interface HydrationResult {
  readonly ok: true;
}

export interface HydrationError {
  readonly ok: false;
  readonly error: AppError;
}

export type HydrationOutcome = HydrationResult | HydrationError;

function isValidStep(step: number): step is MigrationStepValue {
  const validSteps: readonly number[] = Object.values(MIGRATION_STEPS);
  return validSteps.includes(step);
}

function toERPSystem(erpInfo: (typeof ERP_SYSTEMS)[number]): ERPSystem {
  return { id: erpInfo.id, name: erpInfo.name, description: erpInfo.description, fields: [] };
}

export async function hydrateProject(
  client: HttpClient,
  projectId: ProjectId,
  store: MigrationStore,
): Promise<HydrationOutcome> {
  // Fetch project metadata
  const projectResult = await getProject(client, projectId);
  if (!projectResult.ok) {
    return { ok: false, error: projectResult.error };
  }
  const project = projectResult.data;

  if (!isValidStep(project.currentStep)) {
    return { ok: false, error: { code: 'INVALID_STEP', message: `Unknown migration step: ${String(project.currentStep)}` } };
  }
  const targetStep = project.currentStep;

  // Populate project basics
  store.reset();
  store.setProjectId(projectId);
  store.setStep(targetStep);

  for (const step of completedStepsForStep(targetStep)) {
    store.completeStep(step);
  }

  // Resolve ERP IDs to ERPSystem objects
  const sourceERPInfo = ERP_SYSTEMS.find((e) => e.id === project.sourceErp);
  const targetERPInfo = ERP_SYSTEMS.find((e) => e.id === project.targetErp);

  if (sourceERPInfo) store.setSourceERP(toERPSystem(sourceERPInfo));
  if (targetERPInfo) store.setTargetERP(toERPSystem(targetERPInfo));

  // Step 0 (ERPSelect): only needs project metadata + ERPs
  if (targetStep <= MIGRATION_STEPS.ERP_SELECT) {
    return { ok: true };
  }

  // Step >= 1: Fetch files and parsed data
  const filesResult = await getProjectFiles(client, projectId);
  if (!filesResult.ok) {
    return { ok: false, error: filesResult.error };
  }

  const files = filesResult.data;
  const sourceFileDTO = files.find((f) => f.fileType === 'sourcecoa');
  const targetFileDTO = files.find((f) => f.fileType === 'targetcoa');
  const mappingFileDTO = files.find((f) => f.fileType === 'typemapping');

  const [sourceDataResult, targetDataResult, mappingDataResult] = await Promise.all([
    sourceFileDTO ? getFileData(client, sourceFileDTO.fileId) : null,
    targetFileDTO ? getFileData(client, targetFileDTO.fileId) : null,
    mappingFileDTO ? getFileData(client, mappingFileDTO.fileId) : null,
  ]);

  if (sourceFileDTO && sourceDataResult?.ok) {
    store.setSourceData(
      { name: sourceFileDTO.fileName, rowCount: sourceFileDTO.rowCount, fileId: createFileId(sourceFileDTO.fileId) },
      sourceDataResult.data.data,
    );
  }

  if (targetFileDTO && targetDataResult?.ok) {
    store.setTargetData(
      { name: targetFileDTO.fileName, rowCount: targetFileDTO.rowCount, fileId: createFileId(targetFileDTO.fileId) },
      targetDataResult.data.data,
    );
  }

  if (mappingFileDTO && mappingDataResult?.ok) {
    store.setMappingData(
      { name: mappingFileDTO.fileName, rowCount: mappingFileDTO.rowCount, fileId: createFileId(mappingFileDTO.fileId) },
      mappingDataResult.data.data,
    );
  }

  // Step 1 (Upload): needs files + data
  if (targetStep <= MIGRATION_STEPS.UPLOAD) {
    return { ok: true };
  }

  // Step >= 2: Populate target types + type mapping rows
  if (targetDataResult?.ok) {
    const targetTypes = extractAccountTypes(targetDataResult.data.data);
    if (targetTypes.length > 0) {
      store.setTargetTypes(targetTypes);
    }
  }

  if (mappingDataResult?.ok) {
    store.setTypeMappingRows(buildTypeMappingRows(mappingDataResult.data.data));
  }

  // Step 2 (TypeMapping): needs target types + type mapping rows
  if (targetStep <= MIGRATION_STEPS.TYPE_MAPPING) {
    return { ok: true };
  }

  // Step >= 3: Fetch grouped mappings
  const mappingsResult = await getMappings(client, projectId);
  if (mappingsResult.ok && mappingsResult.data.length > 0) {
    store.setGroupedMappings(mappingsResult.data);
  }

  // Step 3 (Validation): needs grouped mappings
  if (targetStep <= MIGRATION_STEPS.VALIDATION) {
    return { ok: true };
  }

  // Step >= 4: Set confirmation flags
  if (mappingsResult.ok && mappingsResult.data.length > 0) {
    store.confirmConfidenceLevel('high');
    store.confirmConfidenceLevel('medium');
    store.confirmConfidenceLevel('low');
  }

  return { ok: true };
}
