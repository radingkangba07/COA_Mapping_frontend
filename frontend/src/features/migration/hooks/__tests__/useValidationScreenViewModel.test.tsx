import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
const mockUpdateMappingStatus = jest.fn<
  Promise<Result<void, AppError>>,
  [unknown, string, number, 'confirmed' | 'pending', number?]
>();

jest.mock('@/features/migration/services/mapping.service', () => ({
  saveMappings: (...args: [unknown, string, readonly MappingCreateDTO[]]) =>
    mockSaveMappings(...args),
  toMappingCreateDTOs: (...args: [string, readonly GroupedMapping[]]) =>
    mockToMappingCreateDTOs(...args),
  updateMappingStatus: (
    ...args: [unknown, string, number, 'confirmed' | 'pending', number?]
  ) => mockUpdateMappingStatus(...args),
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
    mapping_status: 'pending',
    source_account_type: 'Asset',
    target_account_type: 'Fixed Asset',
  };
}

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useValidationScreenViewModel.handleConfirm', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [makeGroupedMapping()];
    mockStoreState.confirmedHigh = false;
    mockStoreState.confirmedMedium = false;
    mockStoreState.confirmedLow = false;
    mockToMappingCreateDTOs.mockReturnValue([makeMappingCreateDTO()]);
    mockSaveMappings.mockResolvedValue(
      ok({ success: true, mapping_count: 1, project_id: 'proj-1', inserted: 1, updated: 0 }),
    );
    mockUpdateMappingStatus.mockResolvedValue(ok(undefined));
    // confirmConfidenceLevel action flips the corresponding store flag
    mockConfirmConfidenceLevel.mockImplementation((level: 'high' | 'medium' | 'low') => {
      if (level === 'high') mockStoreState.confirmedHigh = !mockStoreState.confirmedHigh;
      if (level === 'medium') mockStoreState.confirmedMedium = !mockStoreState.confirmedMedium;
      if (level === 'low') mockStoreState.confirmedLow = !mockStoreState.confirmedLow;
    });
  });

  it('calls updateMappingStatus with the high range when confirming high', async () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockConfirmConfidenceLevel).toHaveBeenCalledWith('high');
    expect(mockUpdateMappingStatus).toHaveBeenCalledTimes(1);
    const call = mockUpdateMappingStatus.mock.calls[0];
    expect(call?.[1]).toBe(projectId);
    // min_score for high, status now 'confirmed', max_score 100
    expect(call?.[3]).toBe('confirmed');
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Confirmed',
      expect.stringContaining('High'),
    );
    // Save path is not used by Confirm anymore
    expect(mockSaveMappings).not.toHaveBeenCalled();
    expect(mockMarkChangesSaved).not.toHaveBeenCalled();
  });

  it('sends status "pending" when toggling off a previously-confirmed level', async () => {
    mockStoreState.confirmedHigh = true; // starts confirmed → confirm again toggles OFF

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockUpdateMappingStatus).toHaveBeenCalledTimes(1);
    const call = mockUpdateMappingStatus.mock.calls[0];
    expect(call?.[3]).toBe('pending');
  });

  it('reverts the local toggle and shows an error toast on status-update failure', async () => {
    mockUpdateMappingStatus.mockResolvedValue(
      err({ code: 'HTTP_500', message: 'Server down' }),
    );

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
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
    let resolveFirst: ((r: Result<void, AppError>) => void) | null = null;
    mockUpdateMappingStatus.mockImplementationOnce(
      () =>
        new Promise<Result<void, AppError>>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      const first = result.current.handleConfirm('high');
      const second = result.current.handleConfirm('high');

      // Only the first call should touch the store/service
      expect(mockConfirmConfidenceLevel).toHaveBeenCalledTimes(1);
      expect(mockUpdateMappingStatus).toHaveBeenCalledTimes(1);

      resolveFirst?.(ok(undefined));
      await Promise.all([first, second]);
    });

    expect(mockUpdateMappingStatus).toHaveBeenCalledTimes(1);
    expect(mockConfirmConfidenceLevel).toHaveBeenCalledTimes(1);
  });
});

describe('useValidationScreenViewModel.handleSaveMappings', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [makeGroupedMapping()];
    mockToMappingCreateDTOs.mockReturnValue([makeMappingCreateDTO()]);
    mockSaveMappings.mockResolvedValue(
      ok({ success: true, mapping_count: 1, project_id: 'proj-1', inserted: 1, updated: 0 }),
    );
  });

  it('calls saveMappings with DTOs from the store and marks changes saved', async () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.handleSaveMappings();
      // flush microtasks until the promise chain resolves
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToMappingCreateDTOs).toHaveBeenCalledWith(
      projectId,
      mockStoreState.groupedMappings,
    );
    expect(mockSaveMappings).toHaveBeenCalledTimes(1);
    const call = mockSaveMappings.mock.calls[0];
    expect(call?.[1]).toBe(projectId);
    expect(call?.[2]).toEqual([makeMappingCreateDTO()]);
    expect(mockMarkChangesSaved).toHaveBeenCalledTimes(1);
    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Mappings saved',
      '1 inserted, 0 updated',
    );
  });

  it('skips the HTTP call and stays silent when there are no DTOs to save', async () => {
    // No-op return value (true) lets the Review & Save button proceed to
    // navigate without surfacing a misleading "Nothing to save" toast.
    mockToMappingCreateDTOs.mockReturnValue([]);

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
    );

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.handleSaveMappings();
    });

    expect(saved).toBe(true);
    expect(mockSaveMappings).not.toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(mockMarkChangesSaved).not.toHaveBeenCalled();
  });

  it('shows an error toast and does not mark saved when the server rejects', async () => {
    mockSaveMappings.mockResolvedValue(
      err({ code: 'HTTP_500', message: 'Server down' }),
    );

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.handleSaveMappings();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockShowError).toHaveBeenCalledWith('Save failed', 'Server down');
    expect(mockMarkChangesSaved).not.toHaveBeenCalled();
  });
});

