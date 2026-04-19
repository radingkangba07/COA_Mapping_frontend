import { act, renderHook } from '@testing-library/react-native';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import type {
  BulkSaveResponseDTO,
  GroupedMapping,
  MappingCreateDTO,
} from '@/features/migration/types/mapping.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockSaveMappings = jest.fn<
  Promise<Result<BulkSaveResponseDTO, AppError>>,
  [unknown, string, readonly MappingCreateDTO[]]
>();
const mockToMappingCreateDTOs = jest.fn<
  MappingCreateDTO[],
  [string, readonly GroupedMapping[]]
>();

jest.mock('@/features/migration/services/mapping.service', () => ({
  saveMappings: (...args: [unknown, string, readonly MappingCreateDTO[]]) =>
    mockSaveMappings(...args),
  toMappingCreateDTOs: (...args: [string, readonly GroupedMapping[]]) =>
    mockToMappingCreateDTOs(...args),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: {},
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: jest.fn(),
  }),
}));

const mockConfirmConfidenceLevel = jest.fn();
const mockMarkChangesSaved = jest.fn();
const mockSyncStep = jest.fn();
jest.mock('../useSyncStep', () => ({
  useSyncStep: () => mockSyncStep,
}));

jest.mock('../useValidation', () => ({
  useValidation: () => ({ errors: [], warnings: [] }),
}));

// Zustand store mock — state + getState for internal reads
interface MockStoreState {
  currentStep: number;
  completedSteps: readonly number[];
  sourceFile: null;
  sourceERP: null;
  targetERP: null;
  groupedMappings: readonly GroupedMapping[];
  confidenceFilter: null;
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  deletedAccounts: readonly unknown[];
  targetTypes: readonly string[];
  hasUnsavedChanges: boolean;
  setStep: jest.Mock;
  completeStep: jest.Mock;
  setConfidenceFilter: jest.Mock;
  confirmConfidenceLevel: jest.Mock;
  updateTypeMapping: jest.Mock;
  updateAccountName: jest.Mock;
  deleteAccount: jest.Mock;
  restoreAccount: jest.Mock;
  markChangesSaved: jest.Mock;
}

const mockStoreState: MockStoreState = {
  currentStep: 3,
  completedSteps: [0, 1, 2],
  sourceFile: null,
  sourceERP: null,
  targetERP: null,
  groupedMappings: [],
  confidenceFilter: null,
  confirmedHigh: false,
  confirmedMedium: false,
  confirmedLow: false,
  deletedAccounts: [],
  targetTypes: [],
  hasUnsavedChanges: false,
  setStep: jest.fn(),
  completeStep: jest.fn(),
  setConfidenceFilter: jest.fn(),
  confirmConfidenceLevel: mockConfirmConfidenceLevel,
  updateTypeMapping: jest.fn(),
  updateAccountName: jest.fn(),
  deleteAccount: jest.fn(),
  restoreAccount: jest.fn(),
  markChangesSaved: mockMarkChangesSaved,
};

jest.mock('../../store/migration.store', () => {
  const hook = (selector: (s: MockStoreState) => unknown) =>
    typeof selector === 'function' ? selector(mockStoreState) : mockStoreState;
  hook.getState = () => mockStoreState;
  return { useMigrationStore: hook };
});

jest.mock('../../store/migration.selectors', () => ({
  selectMappingStats: () => ({
    totalTypes: 0,
    totalAccounts: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    confirmedCount: 0,
  }),
  selectAllConfirmed: () => false,
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn,
}));

// ─── SUT ───────────────────────────────────────────────────────────────────

import { useValidationScreenViewModel } from '../useValidationScreenViewModel';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeGroupedMapping(): GroupedMapping {
  return {
    source_type: 'Asset',
    target_type: 'Fixed Asset',
    confidence: 92,
    accounts: [
      {
        source_number: '1000',
        source_name: 'Cash',
        target_name: 'Cash Equiv',
        score: 95,
        remark: '',
      },
    ],
  };
}

function makeMappingCreateDTO(): MappingCreateDTO {
  return {
    project_id: 'proj-1',
    source_account_name: 'Cash',
    target_account_name: 'Cash Equiv',
    confidence_score: 95,
    status: 'pending',
    source_account_type: 'Asset',
    target_account_type: 'Fixed Asset',
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useValidationScreenViewModel.handleConfirm', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [makeGroupedMapping()];
    mockToMappingCreateDTOs.mockReturnValue([makeMappingCreateDTO()]);
    mockSaveMappings.mockResolvedValue(
      ok({ created: 1, mappings: [] }),
    );
  });

  it('calls saveMappings with flattened DTOs from latest store state', async () => {
    const { result } = renderHook(() =>
      useValidationScreenViewModel(projectId, navigateBack, navigateForward),
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockConfirmConfidenceLevel).toHaveBeenCalledWith('high');
    expect(mockToMappingCreateDTOs).toHaveBeenCalledWith(
      projectId,
      mockStoreState.groupedMappings,
    );
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
    const call = mockSaveMappings.mock.calls[0];
    expect(call?.[1]).toBe(projectId);
    expect(call?.[2]).toEqual([makeMappingCreateDTO()]);
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Confirmed',
      'Saved to server.',
    );
    expect(mockMarkChangesSaved).toHaveBeenCalledTimes(1);
  });

  it('does not call markChangesSaved when save fails', async () => {
    mockSaveMappings.mockResolvedValue(
      err({ code: 'HTTP_500', message: 'Server down' }),
    );

    const { result } = renderHook(() =>
      useValidationScreenViewModel(projectId, navigateBack, navigateForward),
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockMarkChangesSaved).not.toHaveBeenCalled();
  });

  it('reverts confirmation and shows error toast on save failure', async () => {
    mockSaveMappings.mockResolvedValue(
      err({ code: 'HTTP_500', message: 'Server down' }),
    );

    const { result } = renderHook(() =>
      useValidationScreenViewModel(projectId, navigateBack, navigateForward),
    );

    await act(async () => {
      await result.current.handleConfirm('medium');
    });

    // Called twice: once to set, once to revert
    expect(mockConfirmConfidenceLevel).toHaveBeenCalledTimes(2);
    expect(mockConfirmConfidenceLevel).toHaveBeenNthCalledWith(1, 'medium');
    expect(mockConfirmConfidenceLevel).toHaveBeenNthCalledWith(2, 'medium');
    expect(mockShowError).toHaveBeenCalledWith('Confirm failed', 'Server down');
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it('de-dupes overlapping handleConfirm calls via the in-flight ref guard', async () => {
    // Keep the first save "pending" long enough to overlap
    let resolveFirst: ((r: Result<BulkSaveResponseDTO, AppError>) => void) | null = null;
    mockSaveMappings.mockImplementationOnce(
      () =>
        new Promise<Result<BulkSaveResponseDTO, AppError>>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useValidationScreenViewModel(projectId, navigateBack, navigateForward),
    );

    await act(async () => {
      // Fire the first call (will hang), then fire a second while first is in-flight
      const first = result.current.handleConfirm('high');
      const second = result.current.handleConfirm('high');

      // Only the first call should touch the store/service
      expect(mockConfirmConfidenceLevel).toHaveBeenCalledTimes(1);
      expect(mockSaveMappings).toHaveBeenCalledTimes(1);

      // Resolve the first call so promises settle
      resolveFirst?.(ok({ created: 1, mappings: [] }));
      await Promise.all([first, second]);
    });

    // Second call was a no-op — still exactly one save
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
    expect(mockConfirmConfidenceLevel).toHaveBeenCalledTimes(1);
  });
});
