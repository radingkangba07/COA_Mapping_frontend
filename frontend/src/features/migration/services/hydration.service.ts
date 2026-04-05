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
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';
import { matchTypesToTargets } from './fuzzy.service';

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

function resolveERPSystem(erpValue: string, erpSystems: readonly ERPSystem[]): ERPSystem | undefined {
  const lower = erpValue.toLowerCase();
  return erpSystems.find((e) => e.id.toLowerCase() === lower)
    ?? erpSystems.find((e) => e.name.toLowerCase() === lower);
}

export async function hydrateProject(
  client: HttpClient,
  projectId: ProjectId,
  store: MigrationStore,
  erpSystems: readonly ERPSystem[],
): Promise<HydrationOutcome> {
  // Fetch project metadata
  const projectResult = await getProject(client, projectId);
  if (!projectResult.ok) {
    return { ok: false, error: projectResult.error };
  }
  const project = projectResult.data;

  console.log('[hydrateProject] project from API', {
    currentStep: project.currentStep,
    sourceErp: project.sourceErp,
    targetErp: project.targetErp,
  });

  if (!isValidStep(project.currentStep)) {
    return { ok: false, error: { code: 'INVALID_STEP', message: `Unknown migration step: ${String(project.currentStep)}` } };
  }
  const targetStep = project.currentStep;

  // Preserve in-memory ERPs before reset — backend may return empty strings
  const prevSourceERP = store.sourceERP;
  const prevTargetERP = store.targetERP;

  // Populate project basics
  console.log('[hydrateProject] calling store.reset()');
  store.reset();
  store.setProjectId(projectId);
  store.setStep(targetStep);

  for (const step of completedStepsForStep(targetStep)) {
    store.completeStep(step);
  }

  // Resolve ERP IDs to ERPSystem objects from API — fall back to in-memory values
  const sourceERPInfo = project.sourceErp
    ? resolveERPSystem(project.sourceErp, erpSystems)
    : undefined;
  const targetERPInfo = project.targetErp
    ? resolveERPSystem(project.targetErp, erpSystems)
    : undefined;

  console.log('[hydrateProject] ERP resolution', {
    sourceErpId: project.sourceErp,
    targetErpId: project.targetErp,
    sourceFound: !!sourceERPInfo,
    targetFound: !!targetERPInfo,
    prevSourceERP: prevSourceERP?.id ?? null,
    prevTargetERP: prevTargetERP?.id ?? null,
  });

  if (sourceERPInfo) store.setSourceERP(sourceERPInfo);
  else if (prevSourceERP) store.setSourceERP(prevSourceERP);

  if (targetERPInfo) store.setTargetERP(targetERPInfo);
  else if (prevTargetERP) store.setTargetERP(prevTargetERP);

  // Step 0 (ERPSelect): only needs project metadata + ERPs
  if (targetStep <= MIGRATION_STEPS.ERP_SELECT) {
    console.log('[hydrateProject] early return at step 0');
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

  // Attempt to fetch parsed data; fall back to empty rows if endpoint unavailable
  const safeGetFileData = async (fileId: string) => {
    try {
      return await getFileData(client, fileId);
    } catch {
      return null;
    }
  };

  const [sourceDataResult, targetDataResult, mappingDataResult] = await Promise.all([
    sourceFileDTO ? safeGetFileData(sourceFileDTO.fileId) : null,
    targetFileDTO ? safeGetFileData(targetFileDTO.fileId) : null,
    mappingFileDTO ? safeGetFileData(mappingFileDTO.fileId) : null,
  ]);

  if (sourceFileDTO) {
    const rows = sourceDataResult?.ok ? sourceDataResult.data.data : [];
    store.setSourceData(
      { name: sourceFileDTO.fileName, rowCount: rows.length, fileId: createFileId(sourceFileDTO.fileId) },
      rows,
    );
  }

  if (targetFileDTO) {
    const rows = targetDataResult?.ok ? targetDataResult.data.data : [];
    store.setTargetData(
      { name: targetFileDTO.fileName, rowCount: rows.length, fileId: createFileId(targetFileDTO.fileId) },
      rows,
    );
  }

  if (mappingFileDTO) {
    const rows = mappingDataResult?.ok ? mappingDataResult.data.data : [];
    store.setMappingData(
      { name: mappingFileDTO.fileName, rowCount: rows.length, fileId: createFileId(mappingFileDTO.fileId) },
      rows,
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
  } else if (sourceDataResult?.ok) {
    const sourceTypes = extractAccountTypes(sourceDataResult.data.data);
    const targetTypes = targetDataResult?.ok
      ? extractAccountTypes(targetDataResult.data.data)
      : [];
    if (sourceTypes.length > 0) {
      store.setTypeMappingRows(matchTypesToTargets(sourceTypes, targetTypes));
    }
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

  // Derive confirmation flags from account statuses
  if (mappingsResult.ok && mappingsResult.data.length > 0) {
    const allAccounts = mappingsResult.data.flatMap((g) => g.accounts);
    const high = allAccounts.filter((a) => a.score >= CONFIDENCE_THRESHOLDS.HIGH);
    const medium = allAccounts.filter((a) => a.score >= CONFIDENCE_THRESHOLDS.MEDIUM && a.score < CONFIDENCE_THRESHOLDS.HIGH);
    const low = allAccounts.filter((a) => a.score < CONFIDENCE_THRESHOLDS.MEDIUM);

    if (high.length > 0 && high.every((a) => a.status === 'confirmed')) {
      store.confirmConfidenceLevel('high');
    }
    if (medium.length > 0 && medium.every((a) => a.status === 'confirmed')) {
      store.confirmConfidenceLevel('medium');
    }
    if (low.length > 0 && low.every((a) => a.status === 'confirmed')) {
      store.confirmConfidenceLevel('low');
    }
  }

  // Step 3 (Validation): needs grouped mappings + confirmation state
  if (targetStep <= MIGRATION_STEPS.VALIDATION) {
    return { ok: true };
  }

  return { ok: true };
}
