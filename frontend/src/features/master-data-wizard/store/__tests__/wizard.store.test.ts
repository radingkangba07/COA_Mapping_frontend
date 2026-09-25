import { buildEntityKey, useWizardStore } from '../wizard.store';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import { getWorkstreamProgress, completeWorkstreamStage } from '../../services/entity-pack.service';
import { getOrgProjectOverview } from '@/features/project-overview/services/project-overview.service';
import { ok, err } from '@/shared/types/result.types';
import type { ApprovalContext } from '../../types/decision.types';
import type { UploadResult } from '../../types/upload.types';
import type { WorkstreamStageInfo } from '../../services/entity-pack.service';
import type { ProjectOverviewDTO } from '@/features/project-overview/types/project-overview.types';

jest.mock('@/shared/services/storage/storage.service', () => ({
  storageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('../../services/entity-pack.service', () => ({
  getWorkstreamProgress: jest.fn(),
  completeWorkstreamStage: jest.fn(),
}));

jest.mock('@/features/project-overview/services/project-overview.service', () => ({
  getOrgProjectOverview: jest.fn(),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

const mockStorageGet = storageService.get as jest.Mock;
const mockStorageSet = storageService.set as jest.Mock;
const mockGetWorkstreamProgress = getWorkstreamProgress as jest.Mock;
const mockCompleteWorkstreamStage = completeWorkstreamStage as jest.Mock;
const mockGetOrgProjectOverview = getOrgProjectOverview as jest.Mock;

function makeStage(overrides: Partial<WorkstreamStageInfo> = {}): WorkstreamStageInfo {
  return { id: 'stage-upload', name: 'upload', sequence: 1, isCompleted: false, ...overrides };
}

function makeOverviewDTO(workstream: {
  id: string;
  progress?: number;
  status?: string;
  current_stage?: string;
}): ProjectOverviewDTO {
  return {
    id: 'org-1',
    name: 'Org Project',
    project_code: 'OP-1',
    status: 'active',
    source_erp: 'a',
    target_erp: 'b',
    source_deployment: null,
    target_deployment: null,
    last_edited_at: '2026-01-01T00:00:00Z',
    groups: [
      {
        key: 'master-data',
        title: 'Master Data',
        workstreams: [
          {
            id: workstream.id,
            code: 'ITM-001',
            name: 'Items',
            status: workstream.status ?? 'in_progress',
            progress: workstream.progress ?? 50,
            current_stage: workstream.current_stage ?? 'profile',
            included: true,
          },
        ],
      },
    ],
  };
}

// Async store actions here resolve over real microtasks (no fake timers) —
// flush the queue so assertions run after every `.then()`/`await` in the
// action itself has settled, not just the promise this helper is chained onto.
async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function makeUploadResult(overrides: Partial<UploadResult> = {}): UploadResult {
  return {
    fileId: 'file-1',
    fileName: 'a.csv',
    fileType: 'source_erp',
    contentType: 'text/csv',
    sizeBytes: 10,
    status: 'uploaded',
    rowCount: 2,
    storagePath: '/storage/a.csv',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeApprovalContext(overrides: Partial<ApprovalContext> = {}): ApprovalContext {
  return {
    entityId: 'items',
    fieldId: 'account_no',
    reason: 'ai-proposal',
    proposedTargetId: 'default_code',
    previousTargetId: null,
    ...overrides,
  };
}

describe('wizard.store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageSet.mockResolvedValue(undefined);
    mockStorageGet.mockResolvedValue(null);
    mockGetOrgProjectOverview.mockResolvedValue(makeOverviewDTO({ id: 'ws-1' }));
    mockGetWorkstreamProgress.mockResolvedValue(ok({ currentStage: 'profile', stages: [makeStage()] }));
    mockCompleteWorkstreamStage.mockResolvedValue(ok(undefined));
    useWizardStore.getState().reset();
  });

  describe('buildEntityKey', () => {
    it('joins projectId and entityId with a colon', () => {
      expect(buildEntityKey('proj-1', 'items')).toBe('proj-1:items');
    });

    it('produces different keys for different projects with the same entity', () => {
      expect(buildEntityKey('proj-1', 'items')).not.toBe(buildEntityKey('proj-2', 'items'));
    });
  });

  it('starts with the documented initial state', () => {
    const state = useWizardStore.getState();

    expect(state.currentStepId).toBe('upload');
    expect(state.runState).toBe('DRY_RUN');
    expect(state.entityId).toBeNull();
    expect(state.orgProjectId).toBeNull();
    expect(state.parentProjectId).toBeNull();
    expect(state.workstreamId).toBeNull();
    expect(state.stepByEntity).toEqual({});
    expect(state.decisionsByEntity).toEqual({});
    expect(state.uploadedFileByEntity).toEqual({});
    expect(state.sourceCsvByEntity).toEqual({});
    expect(state.pipelineRunIdByEntity).toEqual({});
    expect(state.pendingApproval).toBeNull();
  });

  it('setCurrentStepId updates currentStepId', () => {
    useWizardStore.getState().setCurrentStepId('profile');
    expect(useWizardStore.getState().currentStepId).toBe('profile');
  });

  it('setRunState updates runState', () => {
    useWizardStore.getState().setRunState('LIVE_WRITE');
    expect(useWizardStore.getState().runState).toBe('LIVE_WRITE');
  });

  it('setWizardContext seeds entityId/orgProjectId/parentProjectId/workstreamId', () => {
    useWizardStore.getState().setWizardContext({
      entityId: 'items',
      orgProjectId: 'org-1',
      parentProjectId: 'proj-1',
      workstreamId: 'ws-1',
    });

    const state = useWizardStore.getState();
    expect(state.entityId).toBe('items');
    expect(state.orgProjectId).toBe('org-1');
    expect(state.parentProjectId).toBe('proj-1');
    expect(state.workstreamId).toBe('ws-1');
  });

  describe('recordStep / hydrateStepByEntity', () => {
    it('records the step under buildEntityKey(parentProjectId, entityId) and persists it', () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items',
        orgProjectId: 'org-1',
        parentProjectId: 'proj-1',
        workstreamId: 'ws-1',
      });

      useWizardStore.getState().recordStep('items', 'profile');

      const state = useWizardStore.getState();
      expect(state.currentStepId).toBe('profile');
      expect(state.stepByEntity).toEqual({ 'proj-1:items': 'profile' });
      expect(mockStorageSet).toHaveBeenCalledWith(
        STORAGE_KEYS.WIZARD_STEP_BY_ENTITY,
        JSON.stringify({ 'proj-1:items': 'profile' }),
      );
    });

    it('keeps two different projects running the same entity from colliding', () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      useWizardStore.getState().recordStep('items', 'profile');

      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-2', parentProjectId: 'proj-2', workstreamId: 'ws-2',
      });
      useWizardStore.getState().recordStep('items', 'upload');

      expect(useWizardStore.getState().stepByEntity).toEqual({
        'proj-1:items': 'profile',
        'proj-2:items': 'upload',
      });
    });

    it('a failed persistence write does not throw out of recordStep', () => {
      mockStorageSet.mockRejectedValueOnce(new Error('write failed'));
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });

      expect(() => useWizardStore.getState().recordStep('items', 'profile')).not.toThrow();
    });

    it('hydrateStepByEntity loads and parses the persisted map', async () => {
      mockStorageGet.mockResolvedValue(JSON.stringify({ 'proj-1:items': 'profile' }));

      await useWizardStore.getState().hydrateStepByEntity();

      expect(mockStorageGet).toHaveBeenCalledWith(STORAGE_KEYS.WIZARD_STEP_BY_ENTITY);
      expect(useWizardStore.getState().stepByEntity).toEqual({ 'proj-1:items': 'profile' });
    });

    it('hydrateStepByEntity leaves stepByEntity untouched when there is nothing persisted', async () => {
      mockStorageGet.mockResolvedValue(null);

      await useWizardStore.getState().hydrateStepByEntity();

      expect(useWizardStore.getState().stepByEntity).toEqual({});
    });

    it('hydrateStepByEntity swallows corrupt JSON and leaves stepByEntity untouched', async () => {
      mockStorageGet.mockResolvedValue('not valid json{{{');

      await expect(useWizardStore.getState().hydrateStepByEntity()).resolves.toBeUndefined();
      expect(useWizardStore.getState().stepByEntity).toEqual({});
    });

    it('hydrateStepByEntity swallows a storage read failure', async () => {
      mockStorageGet.mockRejectedValue(new Error('read failed'));

      await expect(useWizardStore.getState().hydrateStepByEntity()).resolves.toBeUndefined();
      expect(useWizardStore.getState().stepByEntity).toEqual({});
    });
  });

  describe('completeStep', () => {
    it('adds the step under buildEntityKey(parentProjectId, entityId), purely locally', () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });

      useWizardStore.getState().completeStep('items', 'upload');

      expect(useWizardStore.getState().completedStepIdsByEntity).toEqual({ 'proj-1:items': ['upload'] });
      expect(mockStorageSet).not.toHaveBeenCalled();
    });

    it('never adds the same step twice', () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });

      useWizardStore.getState().completeStep('items', 'upload');
      useWizardStore.getState().completeStep('items', 'upload');
      useWizardStore.getState().completeStep('items', 'profile');

      expect(useWizardStore.getState().completedStepIdsByEntity).toEqual({ 'proj-1:items': ['upload', 'profile'] });
    });

    it('keeps two different projects running the same entity from colliding', () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      useWizardStore.getState().completeStep('items', 'upload');

      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-2', parentProjectId: 'proj-2', workstreamId: 'ws-2',
      });
      useWizardStore.getState().completeStep('items', 'profile');

      expect(useWizardStore.getState().completedStepIdsByEntity).toEqual({
        'proj-1:items': ['upload'],
        'proj-2:items': ['profile'],
      });
    });

    it('mirrors a completed step to completeWorkstreamStage using the resolved stage id', async () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      mockGetWorkstreamProgress.mockResolvedValue(
        ok({ currentStage: 'upload', stages: [makeStage({ id: 'stage-upload-1', name: 'upload' })] }),
      );
      // Pre-hydrate so workstreamStagesByEntity is populated before completeStep
      // runs — this test is about the resolved stage id reaching the PATCH
      // call, not about the race-retry path (covered separately below).
      await useWizardStore.getState().hydrateEntityProgress('items');

      useWizardStore.getState().completeStep('items', 'upload');
      await flushPromises();

      expect(mockCompleteWorkstreamStage).toHaveBeenCalledWith('ws-1', 'stage-upload-1');
    });

    it('retries via hydrateEntityProgress when workstreamStagesByEntity has not hydrated yet (race on first Continue)', async () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      mockGetWorkstreamProgress.mockResolvedValue(
        ok({ currentStage: 'upload', stages: [makeStage({ id: 'stage-upload-1', name: 'upload' })] }),
      );
      expect(useWizardStore.getState().workstreamStagesByEntity['proj-1:items']).toBeUndefined();

      // No prior hydrateEntityProgress call — workstreamStagesByEntity[key]
      // is empty, so the first lookup inside completeStep must miss and
      // retry via hydrateEntityProgress rather than silently giving up.
      useWizardStore.getState().completeStep('items', 'upload');
      await flushPromises();

      expect(mockGetWorkstreamProgress).toHaveBeenCalledWith('ws-1');
      expect(mockCompleteWorkstreamStage).toHaveBeenCalledWith('ws-1', 'stage-upload-1');
    });

    it('does not call completeWorkstreamStage when the retry also finds no matching stage', async () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      // Server knows about a "profile" stage, not "upload" — stepId never resolves.
      mockGetWorkstreamProgress.mockResolvedValue(
        ok({ currentStage: 'profile', stages: [makeStage({ id: 'stage-profile', name: 'profile' })] }),
      );

      useWizardStore.getState().completeStep('items', 'upload');
      await flushPromises();

      expect(mockCompleteWorkstreamStage).not.toHaveBeenCalled();
      // Local tick still happened regardless — the mirror is best-effort.
      expect(useWizardStore.getState().completedStepIdsByEntity['proj-1:items']).toEqual(['upload']);
    });
  });

  describe('hydrateEntityProgress', () => {
    it('stores the matched workstream row and merges its completed stages into completedStepIdsByEntity', async () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      mockGetOrgProjectOverview.mockResolvedValue(
        makeOverviewDTO({ id: 'ws-1', progress: 40, status: 'in_progress', current_stage: 'mapping' }),
      );
      mockGetWorkstreamProgress.mockResolvedValue(
        ok({
          currentStage: 'mapping',
          stages: [
            makeStage({ id: 's-upload', name: 'upload', isCompleted: true }),
            makeStage({ id: 's-profile', name: 'profile', isCompleted: true }),
            makeStage({ id: 's-mapping', name: 'mapping', isCompleted: false }),
          ],
        }),
      );

      await useWizardStore.getState().hydrateEntityProgress('items');

      const state = useWizardStore.getState();
      expect(state.entityProgressByEntity['proj-1:items']).toEqual({
        progress: 40,
        status: 'in_progress',
        currentStage: 'mapping',
      });
      expect(state.workstreamStagesByEntity['proj-1:items']).toHaveLength(3);
      // This is the fix for "refresh loses completed ticks" — the server's
      // isCompleted flags must reach completedStepIdsByEntity, since that's
      // the field the StepRail's checkmarks actually read from.
      expect(state.completedStepIdsByEntity['proj-1:items']).toEqual(
        expect.arrayContaining(['upload', 'profile']),
      );
      expect(state.completedStepIdsByEntity['proj-1:items']).not.toContain('mapping');
    });

    it('does not clobber an already-locally-ticked step that the server has not caught up on yet', async () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      useWizardStore.getState().completeStep('items', 'values'); // local-only tick, unknown to the server mock
      mockGetWorkstreamProgress.mockResolvedValue(
        ok({ currentStage: 'upload', stages: [makeStage({ id: 's-upload', name: 'upload', isCompleted: true })] }),
      );

      await useWizardStore.getState().hydrateEntityProgress('items');

      expect(useWizardStore.getState().completedStepIdsByEntity['proj-1:items']).toEqual(
        expect.arrayContaining(['values', 'upload']),
      );
    });

    it('bails without writing when the session has moved on before the fetch resolves (stale-session guard)', async () => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
      let resolveOverview: (dto: ProjectOverviewDTO) => void = () => {};
      mockGetOrgProjectOverview.mockReturnValue(
        new Promise((resolve) => {
          resolveOverview = resolve;
        }),
      );

      const hydratePromise = useWizardStore.getState().hydrateEntityProgress('items');

      // Session moves on to a different project/workstream while the fetch
      // above is still in flight.
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-2', parentProjectId: 'proj-2', workstreamId: 'ws-2',
      });
      resolveOverview(makeOverviewDTO({ id: 'ws-1', progress: 99 }));
      await hydratePromise;

      // Nothing written under the old (now stale) session's key.
      expect(useWizardStore.getState().entityProgressByEntity['proj-1:items']).toBeUndefined();
    });
  });

  describe('uploadedFileByEntity / sourceCsvByEntity / pipelineRunIdByEntity', () => {
    beforeEach(() => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
    });

    it('setUploadedFile/clearUploadedFile key by project+entity and persist the map', () => {
      const upload = makeUploadResult();
      useWizardStore.getState().setUploadedFile('items', upload);
      expect(useWizardStore.getState().uploadedFileByEntity).toEqual({ 'proj-1:items': upload });
      expect(mockStorageSet).toHaveBeenCalledWith(
        STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY,
        JSON.stringify({ 'proj-1:items': upload }),
      );

      useWizardStore.getState().clearUploadedFile('items');
      expect(useWizardStore.getState().uploadedFileByEntity).toEqual({});
      expect(mockStorageSet).toHaveBeenLastCalledWith(
        STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY,
        JSON.stringify({}),
      );
    });

    it('setSourceCsv/clearSourceCsv key by project+entity and persist the map', () => {
      const rows = [['a', 'b'], ['1', '2']];
      useWizardStore.getState().setSourceCsv('items', rows);
      expect(useWizardStore.getState().sourceCsvByEntity).toEqual({ 'proj-1:items': rows });
      expect(mockStorageSet).toHaveBeenCalledWith(
        STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY,
        JSON.stringify({ 'proj-1:items': rows }),
      );

      useWizardStore.getState().clearSourceCsv('items');
      expect(useWizardStore.getState().sourceCsvByEntity).toEqual({});
      expect(mockStorageSet).toHaveBeenLastCalledWith(
        STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY,
        JSON.stringify({}),
      );
    });

    it('setPipelineRunId/clearPipelineRunId key by project+entity and persist the map', async () => {
      useWizardStore.getState().setPipelineRunId('items', 'run-1');
      await Promise.resolve(); // flush get().then() chain
      expect(useWizardStore.getState().pipelineRunIdByEntity).toEqual({ 'proj-1:items': 'run-1' });
      expect(mockStorageSet).toHaveBeenCalledWith(
        STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY,
        JSON.stringify({ 'proj-1:items': 'run-1' }),
      );

      useWizardStore.getState().clearPipelineRunId('items');
      await Promise.resolve(); // flush get().then() chain
      expect(useWizardStore.getState().pipelineRunIdByEntity).toEqual({});
      expect(mockStorageSet).toHaveBeenLastCalledWith(
        STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY,
        JSON.stringify({}),
      );
    });

    it('setPipelineRunId merges with existing storage — does not wipe other entities', async () => {
      mockStorageGet.mockResolvedValue(JSON.stringify({ 'proj-1:customers': 'run-customers' }));
      useWizardStore.getState().setPipelineRunId('items', 'run-items');
      await Promise.resolve();
      expect(mockStorageSet).toHaveBeenCalledWith(
        STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY,
        JSON.stringify({ 'proj-1:customers': 'run-customers', 'proj-1:items': 'run-items' }),
      );
    });

    it('clearPipelineRunId merges with existing storage — does not wipe other entities', async () => {
      mockStorageGet.mockResolvedValue(
        JSON.stringify({ 'proj-1:customers': 'run-customers', 'proj-1:items': 'run-items' }),
      );
      useWizardStore.getState().clearPipelineRunId('items');
      await Promise.resolve();
      expect(mockStorageSet).toHaveBeenLastCalledWith(
        STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY,
        JSON.stringify({ 'proj-1:customers': 'run-customers' }),
      );
    });

    it('a different project does not see this project\'s uploaded file for the same entity', () => {
      useWizardStore.getState().setUploadedFile('items', makeUploadResult());

      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-2', parentProjectId: 'proj-2', workstreamId: 'ws-2',
      });

      expect(useWizardStore.getState().uploadedFileByEntity['proj-2:items']).toBeUndefined();
      expect(useWizardStore.getState().uploadedFileByEntity['proj-1:items']).toBeDefined();
    });

    it('a failed persistence write does not throw out of setUploadedFile/setSourceCsv/setPipelineRunId', () => {
      mockStorageSet.mockRejectedValue(new Error('write failed'));

      expect(() => useWizardStore.getState().setUploadedFile('items', makeUploadResult())).not.toThrow();
      expect(() => useWizardStore.getState().setSourceCsv('items', [['a']])).not.toThrow();
      expect(() => useWizardStore.getState().setPipelineRunId('items', 'run-1')).not.toThrow();
    });
  });

  describe('hydrateUploadedFileByEntity', () => {
    it('loads and parses all three persisted maps', async () => {
      const upload = makeUploadResult();
      const rows = [['a', 'b'], ['1', '2']];
      mockStorageGet.mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY) {
          return Promise.resolve(JSON.stringify({ 'proj-1:items': upload }));
        }
        if (key === STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY) {
          return Promise.resolve(JSON.stringify({ 'proj-1:items': rows }));
        }
        if (key === STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY) {
          return Promise.resolve(JSON.stringify({ 'proj-1:items': 'run-1' }));
        }
        return Promise.resolve(null);
      });

      await useWizardStore.getState().hydrateUploadedFileByEntity();

      const state = useWizardStore.getState();
      expect(state.uploadedFileByEntity).toEqual({ 'proj-1:items': upload });
      expect(state.sourceCsvByEntity).toEqual({ 'proj-1:items': rows });
      expect(state.pipelineRunIdByEntity).toEqual({ 'proj-1:items': 'run-1' });
    });

    it('leaves the maps at their initial {} when nothing is persisted', async () => {
      mockStorageGet.mockResolvedValue(null);

      await useWizardStore.getState().hydrateUploadedFileByEntity();

      const state = useWizardStore.getState();
      expect(state.uploadedFileByEntity).toEqual({});
      expect(state.sourceCsvByEntity).toEqual({});
      expect(state.pipelineRunIdByEntity).toEqual({});
    });

    it('swallows corrupt JSON or a storage read failure for one map without affecting the others', async () => {
      const upload = makeUploadResult();
      mockStorageGet.mockImplementation((key: string) => {
        if (key === STORAGE_KEYS.WIZARD_UPLOADED_FILE_BY_ENTITY) {
          return Promise.resolve(JSON.stringify({ 'proj-1:items': upload }));
        }
        if (key === STORAGE_KEYS.WIZARD_SOURCE_CSV_BY_ENTITY) {
          return Promise.resolve('not valid json{{{');
        }
        if (key === STORAGE_KEYS.WIZARD_PIPELINE_RUN_ID_BY_ENTITY) {
          return Promise.reject(new Error('read failed'));
        }
        return Promise.resolve(null);
      });

      await expect(useWizardStore.getState().hydrateUploadedFileByEntity()).resolves.toBeUndefined();

      const state = useWizardStore.getState();
      expect(state.uploadedFileByEntity).toEqual({ 'proj-1:items': upload });
      expect(state.sourceCsvByEntity).toEqual({});
      expect(state.pipelineRunIdByEntity).toEqual({});
    });
  });

  describe('approval + decisions', () => {
    beforeEach(() => {
      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
      });
    });

    it('raiseApproval sets pendingApproval; cancelApproval clears it without recording a decision', () => {
      const context = makeApprovalContext();
      useWizardStore.getState().raiseApproval(context);
      expect(useWizardStore.getState().pendingApproval).toEqual(context);

      useWizardStore.getState().cancelApproval();
      expect(useWizardStore.getState().pendingApproval).toBeNull();
      expect(useWizardStore.getState().decisionsByEntity).toEqual({});
    });

    it('confirmApproval is a no-op when there is no pending approval', () => {
      useWizardStore.getState().confirmApproval();
      expect(useWizardStore.getState().decisionsByEntity).toEqual({});
    });

    it('confirmApproval records an "accepted" decision for reason ai-proposal, keyed by project+entity', () => {
      useWizardStore.getState().raiseApproval(makeApprovalContext({ reason: 'ai-proposal', proposedTargetId: 'default_code' }));

      useWizardStore.getState().confirmApproval('suresh@linkederp.com');

      const decisions = useWizardStore.getState().decisionsByEntity['proj-1:items'];
      expect(decisions).toHaveLength(1);
      expect(decisions?.[0]).toMatchObject({
        fieldId: 'account_no',
        status: 'accepted',
        targetId: 'default_code',
        decidedBy: 'suresh@linkederp.com',
      });
      expect(useWizardStore.getState().pendingApproval).toBeNull();
    });

    it('confirmApproval records an "overridden" decision for reason user-override, keeping previousTargetId', () => {
      useWizardStore.getState().raiseApproval(makeApprovalContext({
        reason: 'user-override',
        proposedTargetId: 'partner_id',
        previousTargetId: 'default_code',
      }));

      useWizardStore.getState().confirmApproval();

      const decisions = useWizardStore.getState().decisionsByEntity['proj-1:items'];
      expect(decisions?.[0]).toMatchObject({
        status: 'overridden',
        targetId: 'partner_id',
        previousTargetId: 'default_code',
      });
    });

    it('confirmApproval replaces a prior decision for the same field rather than appending', () => {
      useWizardStore.getState().raiseApproval(makeApprovalContext({ proposedTargetId: 'default_code' }));
      useWizardStore.getState().confirmApproval();
      useWizardStore.getState().raiseApproval(makeApprovalContext({ proposedTargetId: 'partner_id' }));
      useWizardStore.getState().confirmApproval();

      const decisions = useWizardStore.getState().decisionsByEntity['proj-1:items'];
      expect(decisions).toHaveLength(1);
      expect(decisions?.[0]!.targetId).toBe('partner_id');
    });

    it('excludeField records an "excluded" decision', () => {
      useWizardStore.getState().excludeField('items', 'legacy_notes', 'suresh@linkederp.com');

      const decisions = useWizardStore.getState().decisionsByEntity['proj-1:items'];
      expect(decisions?.[0]).toMatchObject({ fieldId: 'legacy_notes', status: 'excluded', decidedBy: 'suresh@linkederp.com' });
    });

    it('clearFieldDecision removes a field\'s decision', () => {
      useWizardStore.getState().excludeField('items', 'legacy_notes');
      useWizardStore.getState().clearFieldDecision('items', 'legacy_notes');

      expect(useWizardStore.getState().decisionsByEntity['proj-1:items']).toEqual([]);
    });

    it('decisions for the same entity in a different project are isolated', () => {
      useWizardStore.getState().excludeField('items', 'legacy_notes');

      useWizardStore.getState().setWizardContext({
        entityId: 'items', orgProjectId: 'org-2', parentProjectId: 'proj-2', workstreamId: 'ws-2',
      });
      useWizardStore.getState().excludeField('items', 'other_field');

      expect(useWizardStore.getState().decisionsByEntity['proj-1:items']).toHaveLength(1);
      expect(useWizardStore.getState().decisionsByEntity['proj-2:items']).toHaveLength(1);
      expect(useWizardStore.getState().decisionsByEntity['proj-1:items']?.[0]!.fieldId).toBe('legacy_notes');
      expect(useWizardStore.getState().decisionsByEntity['proj-2:items']?.[0]!.fieldId).toBe('other_field');
    });
  });

  it('reset restores the store to its initial state', () => {
    useWizardStore.getState().setWizardContext({
      entityId: 'items', orgProjectId: 'org-1', parentProjectId: 'proj-1', workstreamId: 'ws-1',
    });
    useWizardStore.getState().setUploadedFile('items', makeUploadResult());
    useWizardStore.getState().excludeField('items', 'legacy_notes');
    useWizardStore.getState().raiseApproval(makeApprovalContext());

    useWizardStore.getState().reset();

    const state = useWizardStore.getState();
    expect(state.entityId).toBeNull();
    expect(state.parentProjectId).toBeNull();
    expect(state.uploadedFileByEntity).toEqual({});
    expect(state.decisionsByEntity).toEqual({});
    expect(state.pendingApproval).toBeNull();
    expect(state.currentStepId).toBe('upload');
    expect(state.runState).toBe('DRY_RUN');
  });
});
