// DA-94 — CSV upload-path regression test.
//
// The MCP work (DA-50/DA-52/DA-84) added a method branch ('mcp' vs 'csv') and a
// `connectionReady` gate to the create flow. This flow/regression test proves the
// pre-existing CSV path is unaffected by chaining the REAL stores + REAL hooks/
// services, mocking only side-effect boundaries:
//
//   1) CSV stays the active branch (UploadScreen shows FileUploader, not the
//      Fetch-from-ERP step) AND a valid create path exists WITHOUT a test
//      connection — the MCP `connectionReady` gate must NOT leak into CSV.
//   2) CSV upload -> processFiles -> reach the mapping step (currentStep 1 -> 2)
//      still advances, exercising the real fuzzy + file-processing services.

import { act, renderHook } from '@testing-library/react-native';

// ─── Boundary mocks (declared before importing hooks under test) ─────────────

// useFetchFromErp reads httpClient at module load; give it a harmless post stub.
jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: { post: jest.fn() },
}));

// useMigrationViewModel side-effect deps — mocked so processFiles runs without
// navigation / toast / step-sync infrastructure. The store + services stay REAL.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, getState: () => undefined }),
}));

const mockSyncStep = jest.fn();
jest.mock('../../hooks/useSyncStep', () => ({
  useSyncStep: () => mockSyncStep,
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { useFetchFromErp } from '../../hooks/useFetchFromErp';
import { useMigrationViewModel } from '../../hooks/useMigrationViewModel';
import { useMigrationStore } from '../../store/migration.store';
import { selectCurrentStep } from '../../store/migration.selectors';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { selectCanCreateProject } from '@/features/projects/store/project-scope.selectors';
import { createFileId } from '@/shared/types/common.types';
import type { ERPSystem } from '../../types/erp.types';
import type { UploadedFile } from '../../types/migration.types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SOURCE_ERP: ERPSystem = {
  id: 'sap',
  name: 'SAP',
  description: 'SAP ERP',
  fields: [],
};
const TARGET_ERP: ERPSystem = {
  id: 'netsuite',
  name: 'NetSuite',
  description: 'Oracle NetSuite',
  fields: [],
};

const SOURCE_FILE: UploadedFile = {
  name: 'source-coa.csv',
  rowCount: 2,
  fileId: createFileId('csv-source-file'),
};
const TARGET_FILE: UploadedFile = {
  name: 'target-coa.csv',
  rowCount: 2,
  fileId: createFileId('csv-target-file'),
};

// CSV-shaped rows: account code/name/type keys so extractAccountTypes() finds a
// "type" column and matchTypesToTargets() has data to score.
const SOURCE_ROWS: Record<string, unknown>[] = [
  { account_code: '1000', account_name: 'Cash', account_type: 'Asset' },
  { account_code: '4000', account_name: 'Sales Revenue', account_type: 'Revenue' },
];
const TARGET_ROWS: Record<string, unknown>[] = [
  { account_code: 'A100', account_name: 'Cash & Equivalents', account_type: 'Assets' },
  { account_code: 'R400', account_name: 'Revenue', account_type: 'Income' },
];

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  useProjectScopeStore.getState().reset();
  useMigrationStore.getState().reset();
});

describe('DA-94 CSV upload-path regression', () => {
  it('keeps CSV as the active branch and a valid create path WITHOUT a test connection', () => {
    // Seed a complete CSV-method project scope draft. No test connection is run,
    // so connectionReady stays false.
    const scope = useProjectScopeStore.getState();
    act(() => {
      scope.setCompanyId('company-1');
      scope.setSource(SOURCE_ERP.id);
      scope.setTarget(TARGET_ERP.id);
      scope.setMethod('csv');
    });

    const { result } = renderHook(() => useFetchFromErp());

    // CSV branch is active — this is what makes UploadScreen render the
    // FileUploader rather than the Fetch-from-ERP step.
    expect(result.current.method).toBe('csv');

    // Regression guard: the MCP connectionReady gate must NOT leak into CSV.
    // The connection is not ready, yet the project can still be created.
    expect(useProjectScopeStore.getState().connectionReady).toBe(false);
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);

    // useCsvFallback() switches an 'mcp' draft back to 'csv'.
    act(() => {
      useProjectScopeStore.getState().setMethod('mcp');
    });
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(false);

    act(() => {
      result.current.useCsvFallback();
    });
    expect(useProjectScopeStore.getState().draft.method).toBe('csv');
    expect(selectCanCreateProject(useProjectScopeStore.getState())).toBe(true);
  });

  it('advances CSV upload -> processFiles -> mapping step (1 -> 2)', async () => {
    // Seed the REAL migration store as if the CSV upload completed: source/target
    // ERPs, source/target files + parsed CSV rows, sitting on the upload step.
    const store = useMigrationStore.getState();
    act(() => {
      store.setSourceERP(SOURCE_ERP);
      store.setTargetERP(TARGET_ERP);
      // setSourceData / setTargetData set the file + data AND clear pending-removal,
      // so selectEffectiveSourceFile returns the file.
      store.setSourceData(SOURCE_FILE, SOURCE_ROWS);
      store.setTargetData(TARGET_FILE, TARGET_ROWS);
      store.completeStep(0);
      store.setStep(1);
    });

    expect(selectCurrentStep(useMigrationStore.getState())).toBe(1);

    const { result } = renderHook(() => useMigrationViewModel());

    // The effective source file resolves (precondition for processFiles).
    expect(result.current.sourceFile).not.toBeNull();

    await act(async () => {
      await result.current.processFiles();
    });

    // Mapping step is reachable and step 1 is recorded complete.
    const advanced = useMigrationStore.getState();
    expect(selectCurrentStep(advanced)).toBe(2);
    expect(advanced.completedSteps).toContain(1);
    expect(mockShowError).not.toHaveBeenCalled();
  });
});
