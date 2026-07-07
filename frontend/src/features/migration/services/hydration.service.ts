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
import { extractAccountTypes, buildTypeMappingRows } from './file-processing.service';
import { matchTypesToTargets } from './fuzzy.service';

export interface HydrationResult {
  readonly ok: true;
  readonly warnings?: readonly string[];
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

  if (!isValidStep(project.currentStep)) {
    return { ok: false, error: { code: 'INVALID_STEP', message: `Unknown migration step: ${String(project.currentStep)}` } };
  }
  const targetStep = project.currentStep;

  // Preserve in-memory ERPs before reset — backend may return empty strings
  const prevSourceERP = store.sourceERP;
  const prevTargetERP = store.targetERP;

  // Populate project basics
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

  if (sourceERPInfo) store.setSourceERP(sourceERPInfo);
  else if (prevSourceERP) store.setSourceERP(prevSourceERP);

  if (targetERPInfo) store.setTargetERP(targetERPInfo);
  else if (prevTargetERP) store.setTargetERP(prevTargetERP);

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

  // Attempt to fetch parsed data; track failures for user-visible warnings
  const safeGetFileData = async (fileId: string) => {
    try {
      const data = await getFileData(client, fileId);
      return { data, failed: false };
    } catch {
      return { data: null, failed: true };
    }
  };

  const [sourceDataResult, targetDataResult, mappingDataResult] = await Promise.all([
    sourceFileDTO ? safeGetFileData(sourceFileDTO.fileId) : null,
    targetFileDTO ? safeGetFileData(targetFileDTO.fileId) : null,
    mappingFileDTO ? safeGetFileData(mappingFileDTO.fileId) : null,
  ]);

  const hydrationWarnings: string[] = [];
  if (sourceFileDTO && sourceDataResult?.failed)
    hydrationWarnings.push('Source COA file data could not be loaded. Try re-uploading the file.');
  if (targetFileDTO && targetDataResult?.failed)
    hydrationWarnings.push('Target COA file data could not be loaded — the target account dropdown may be empty. Try re-uploading the file.');
  if (mappingFileDTO && mappingDataResult?.failed)
    hydrationWarnings.push('Account type mapping file data could not be loaded. Try re-uploading the file.');

  if (sourceFileDTO) {
    const rows = sourceDataResult?.data?.ok ? sourceDataResult.data.data.data : [];
    const rowCount = sourceDataResult?.data?.ok
      ? sourceDataResult.data.data.rowCount
      : sourceFileDTO.rowCount;
    store.setSourceData(
      { name: sourceFileDTO.fileName, rowCount, fileId: createFileId(sourceFileDTO.fileId) },
      rows,
    );
  }

  if (targetFileDTO) {
    const rows = targetDataResult?.data?.ok ? targetDataResult.data.data.data : [];
    const rowCount = targetDataResult?.data?.ok
      ? targetDataResult.data.data.rowCount
      : targetFileDTO.rowCount;
    store.setTargetData(
      { name: targetFileDTO.fileName, rowCount, fileId: createFileId(targetFileDTO.fileId) },
      rows,
    );
  }

  if (mappingFileDTO) {
    const rows = mappingDataResult?.data?.ok ? mappingDataResult.data.data.data : [];
    const rowCount = mappingDataResult?.data?.ok
      ? mappingDataResult.data.data.rowCount
      : mappingFileDTO.rowCount;
    store.setMappingData(
      { name: mappingFileDTO.fileName, rowCount, fileId: createFileId(mappingFileDTO.fileId) },
      rows,
    );
  }

  // Step 1 (Upload): needs files + data
  if (targetStep <= MIGRATION_STEPS.UPLOAD) {
    return { ok: true, ...(hydrationWarnings.length > 0 ? { warnings: hydrationWarnings } : {}) };
  }

  // Step >= 2: Populate target types + type mapping rows
  if (targetDataResult?.data?.ok) {
    const targetTypes = extractAccountTypes(targetDataResult.data.data.data);
    if (targetTypes.length > 0) {
      store.setTargetTypes(targetTypes);
    }
  }

  if (mappingDataResult?.data?.ok) {
    store.hydrateTypeMappingRows(buildTypeMappingRows(mappingDataResult.data.data.data));
  } else if (sourceDataResult?.data?.ok) {
    const sourceTypes = extractAccountTypes(sourceDataResult.data.data.data);
    const targetTypes = targetDataResult?.data?.ok
      ? extractAccountTypes(targetDataResult.data.data.data)
      : [];
    if (sourceTypes.length > 0) {
      store.hydrateTypeMappingRows(matchTypesToTargets(sourceTypes, targetTypes));
    }
  }

  // Restore jobId from backend — check if this project has an active mapping job
  try {
    const jobsResp = await client.get<Array<{ id: string; job_type: string; status: string }>>(
      `/api/v1/jobs/project/${projectId}`,
    );
    const accountJob = jobsResp.data.find(
      (j) => j.job_type === 'account_matching' && (j.status === 'queued' || j.status === 'running'),
    );
    if (accountJob) {
      store.setJobId(accountJob.id);
    }
  } catch (jobErr) {
    console.warn('[hydrateProject] failed to fetch jobs — continuing without jobId', jobErr);
  }

  // Step 2 (TypeMapping): needs target types + type mapping rows
  if (targetStep <= MIGRATION_STEPS.TYPE_MAPPING) {
    return { ok: true, ...(hydrationWarnings.length > 0 ? { warnings: hydrationWarnings } : {}) };
  }

  // Step >= 3: confirmation flags (confirmedHigh/Medium/Low) and per-account
  // confirmed status/lock are derived authoritatively in the store's
  // setGroupedMappings, once ValidationScreen loads the full suggestions
  // list via useMappingSuggestions. That list includes suggestion-only rows
  // (never materialized into coa_mappings), unlike this legacy mappings
  // fetch, so deriving flags here would undercount band totals and could
  // mark a band "confirmed" prematurely. groupedMappings itself is
  // intentionally NOT set here either — setting it would race with (and be
  // overwritten by) the suggestions query result.

  // Step 3 (Validation): needs grouped mappings + confirmation state
  if (targetStep <= MIGRATION_STEPS.VALIDATION) {
    return { ok: true, ...(hydrationWarnings.length > 0 ? { warnings: hydrationWarnings } : {}) };
  }

  return { ok: true, ...(hydrationWarnings.length > 0 ? { warnings: hydrationWarnings } : {}) };
}
