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

// Defaults to "proceed" so existing confirm-flow tests don't need to opt into
// the no-selection dialog explicitly. Tests targeting the dialog itself
// override this per-test.
const mockConfirmNoSelection = jest.fn<Promise<boolean>, [unknown]>().mockResolvedValue(true);
jest.mock('@/shared/hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockConfirmNoSelection,
    isVisible: false,
    confirmOptions: null,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }),
}));

// Zustand store mock — state + getState for internal reads
interface MockStoreState {
  currentStep: number;
  completedSteps: readonly number[];
  sourceFile: null;
  sourceERP: null;
  targetERP: null;
  groupedMappings: readonly GroupedMapping[];
  confirmedHigh: boolean;
  confirmedMedium: boolean;
  confirmedLow: boolean;
  confidenceFilter: 'high' | 'medium' | 'low' | null;
  targetTypes: readonly string[];
  targetData: readonly Record<string, unknown>[];
  hasUnsavedChanges: boolean;
  selection: Record<string, true>;
  confirmedAccountKeys: Record<string, true>;
  setStep: jest.Mock;
  completeStep: jest.Mock;
  confirmConfidenceLevel: jest.Mock;
  updateTypeMapping: jest.Mock;
  updateAccountName: jest.Mock;
  deleteAccount: jest.Mock;
  restoreAccount: jest.Mock;
  markChangesSaved: jest.Mock;
  setConfidenceFilter: jest.Mock;
  toggleAccountSelection: jest.Mock;
  setSelectionForKeys: jest.Mock;
  clearSelection: jest.Mock;
  bulkDeleteSelected: jest.Mock;
  confirmAccountsByKeys: jest.Mock;
  resetBandConfirmation: jest.Mock;
}

const mockSetConfidenceFilter = jest.fn();

const mockStoreState: MockStoreState = {
  currentStep: 3,
  completedSteps: [0, 1, 2],
  sourceFile: null,
  sourceERP: null,
  targetERP: null,
  groupedMappings: [],
  confirmedHigh: false,
  confirmedMedium: false,
  confirmedLow: false,
  confidenceFilter: null,
  targetTypes: [],
  targetData: [],
  hasUnsavedChanges: false,
  selection: {},
  confirmedAccountKeys: {},
  setStep: jest.fn(),
  completeStep: jest.fn(),
  confirmConfidenceLevel: mockConfirmConfidenceLevel,
  updateTypeMapping: jest.fn(),
  updateAccountName: jest.fn(),
  deleteAccount: jest.fn(),
  restoreAccount: jest.fn(),
  markChangesSaved: mockMarkChangesSaved,
  setConfidenceFilter: mockSetConfidenceFilter,
  toggleAccountSelection: jest.fn(),
  setSelectionForKeys: jest.fn(),
  clearSelection: jest.fn(),
  bulkDeleteSelected: jest.fn(),
  confirmAccountsByKeys: jest.fn(),
  resetBandConfirmation: jest.fn(),
};

jest.mock('../../store/migration.store', () => {
  const hook = (selector: (s: MockStoreState) => unknown) =>
    typeof selector === 'function' ? selector(mockStoreState) : mockStoreState;
  hook.getState = () => mockStoreState;
  return { useMigrationStore: hook };
});

jest.mock('../../store/migration.selectors', () => {
  const actual = jest.requireActual('../../store/migration.selectors');
  return {
    ...actual,
    selectMappingStats: () => ({
      totalTypes: 0,
      totalAccounts: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      confirmedCount: 0,
    }),
    selectAllConfirmed: () => false,
  };
});

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
    mockStoreState.confidenceFilter = null;
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

  it('calls confirmAccountsByKeys with selected keys when confirming high', async () => {
    mockStoreState.selection = {
      'Asset::1000::Cash': true,
      'Asset::2000::Bank': true,
    };
    mockStoreState.groupedMappings = [
      {
        source_type: 'Asset',
        target_type: 'Fixed Asset',
        confidence: 95,
        accounts: [
          { source_number: '1000', source_name: 'Cash', target_name: 'Cash Equiv', score: 95, remark: '' },
          { source_number: '2000', source_name: 'Bank', target_name: 'Bank Equiv', score: 92, remark: '' },
        ],
      },
    ];

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockConfirmNoSelection).not.toHaveBeenCalled();
    expect(mockStoreState.confirmAccountsByKeys).toHaveBeenCalledWith(
      'high',
      expect.arrayContaining(['Asset::1000::Cash', 'Asset::2000::Bank']),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Confirmed', expect.stringContaining('High'));
  });

  it('calls confirmAccountsByKeys with selected keys when confirming medium', async () => {
    mockStoreState.selection = { 'Asset::3000::Debtors': true };
    mockStoreState.groupedMappings = [
      {
        source_type: 'Asset',
        target_type: 'Current Asset',
        confidence: 80,
        accounts: [
          { source_number: '3000', source_name: 'Debtors', target_name: 'Receivables', score: 80, remark: '' },
        ],
      },
    ];

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('medium');
    });

    expect(mockConfirmNoSelection).not.toHaveBeenCalled();
    expect(mockStoreState.confirmAccountsByKeys).toHaveBeenCalledWith(
      'medium',
      expect.arrayContaining(['Asset::3000::Debtors']),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Confirmed', expect.stringContaining('Medium'));
  });

  it('calls confirmAccountsByKeys with selected keys when confirming low', async () => {
    mockStoreState.selection = { 'Asset::4000::Sundry': true };
    mockStoreState.groupedMappings = [
      {
        source_type: 'Asset',
        target_type: 'Current Asset',
        confidence: 40,
        accounts: [
          { source_number: '4000', source_name: 'Sundry', target_name: 'Misc', score: 40, remark: '' },
        ],
      },
    ];

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('low');
    });

    expect(mockConfirmNoSelection).not.toHaveBeenCalled();
    expect(mockStoreState.confirmAccountsByKeys).toHaveBeenCalledWith(
      'low',
      expect.arrayContaining(['Asset::4000::Sundry']),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Confirmed', expect.stringContaining('Low'));
  });

  it('confirms all in-band accounts when nothing is checked (select-all fallback)', async () => {
    mockStoreState.selection = {};
    mockStoreState.groupedMappings = [
      {
        source_type: 'Asset',
        target_type: 'Fixed Asset',
        confidence: 95,
        accounts: [
          { source_number: '1000', source_name: 'Cash', target_name: 'Cash Equiv', score: 95, remark: '' },
          { source_number: '2000', source_name: 'Bank', target_name: 'Bank Equiv', score: 92, remark: '' },
        ],
      },
    ];

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockConfirmNoSelection).not.toHaveBeenCalled();
    expect(mockStoreState.confirmAccountsByKeys).toHaveBeenCalledWith(
      'high',
      expect.arrayContaining(['Asset::1000::Cash', 'Asset::2000::Bank']),
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Confirmed', expect.stringContaining('High'));
  });

  it('shows a dialog and does not confirm when the band has no accounts at all', async () => {
    mockStoreState.selection = {};
    mockStoreState.groupedMappings = [];

    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.handleConfirm('high');
    });

    expect(mockConfirmNoSelection).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No Accounts to Confirm' }),
    );
    expect(mockStoreState.confirmAccountsByKeys).not.toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });
});

describe('useValidationScreenViewModel.handleResetBand', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [makeGroupedMapping()];
    mockStoreState.confidenceFilter = null;
  });

  it('calls resetBandConfirmation with "high" when resetting high band', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleResetBand('high');
    });

    expect(mockStoreState.resetBandConfirmation).toHaveBeenCalledWith('high');
  });

  it('calls resetBandConfirmation with "medium" when resetting medium band', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleResetBand('medium');
    });

    expect(mockStoreState.resetBandConfirmation).toHaveBeenCalledWith('medium');
  });

  it('calls resetBandConfirmation with "low" when resetting low band', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleResetBand('low');
    });

    expect(mockStoreState.resetBandConfirmation).toHaveBeenCalledWith('low');
  });

  it('does not call confirmAccountsByKeys when resetting', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleResetBand('high');
    });

    expect(mockStoreState.confirmAccountsByKeys).not.toHaveBeenCalled();
  });
});

describe('useValidationScreenViewModel.handleSaveMappings', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [makeGroupedMapping()];
    mockStoreState.confidenceFilter = null;
    mockToMappingCreateDTOs.mockReturnValue([makeMappingCreateDTO()]);
    mockSaveMappings.mockResolvedValue(
      ok({ success: true, mapping_count: 1, project_id: 'proj-1', inserted: 1, updated: 0 }),
    );
  });

  it('calls saveMappings with DTOs from the store and marks changes saved', async () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
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
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
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
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
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

// ─── filteredMappings ───────────────────────────────────────────────────────

describe('useValidationScreenViewModel.filteredMappings', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  const highAccount = { source_number: 'H1', source_name: 'High', target_name: 'H', score: 100, remark: '' };
  const mediumAccount = { source_number: 'M1', source_name: 'Medium', target_name: 'M', score: 75, remark: '' };
  const lowAccount = { source_number: 'L1', source_name: 'Low', target_name: 'L', score: 60, remark: '' };

  const mixedGroup: GroupedMapping = {
    source_type: 'Mixed',
    target_type: 'Target',
    confidence: 75,
    accounts: [highAccount, mediumAccount, lowAccount],
  };
  const highOnlyGroup: GroupedMapping = {
    source_type: 'HighOnly',
    target_type: 'Target',
    confidence: 100,
    accounts: [highAccount],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [mixedGroup, highOnlyGroup];
    mockStoreState.confidenceFilter = null;
  });

  it('shows all active accounts when filter is null', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    const allAccounts = result.current.filteredMappings.flatMap((g) => g.accounts);
    expect(allAccounts).toHaveLength(4);
  });

  it('shows only ≥90% accounts when filter is high', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    act(() => { result.current.handleFilterPress('high'); });
    const allAccounts = result.current.filteredMappings.flatMap((g) => g.accounts);
    expect(allAccounts).toHaveLength(2);
    expect(allAccounts.every((a) => a.score >= 90)).toBe(true);
  });

  it('shows only 70–89% accounts when filter is medium', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    act(() => { result.current.handleFilterPress('medium'); });
    const allAccounts = result.current.filteredMappings.flatMap((g) => g.accounts);
    expect(allAccounts).toHaveLength(1);
    expect(allAccounts[0]?.score).toBe(75);
  });

  it('shows only <70% accounts when filter is low', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    act(() => { result.current.handleFilterPress('low'); });
    const allAccounts = result.current.filteredMappings.flatMap((g) => g.accounts);
    expect(allAccounts).toHaveLength(1);
    expect(allAccounts[0]?.score).toBe(60);
  });

  it('excludes groups where all accounts are filtered out', () => {
    mockStoreState.groupedMappings = [
      { source_type: 'LowOnly', target_type: 'T', confidence: 60, accounts: [lowAccount] },
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    act(() => { result.current.handleFilterPress('high'); });
    expect(result.current.filteredMappings).toHaveLength(0);
  });

  it('excludes tombstoned (is_active=false) accounts regardless of filter', () => {
    const tombstoned = { ...highAccount, is_active: false as const };
    mockStoreState.groupedMappings = [
      { source_type: 'G', target_type: 'T', confidence: 100, accounts: [tombstoned, mediumAccount] },
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    const allAccounts = result.current.filteredMappings.flatMap((g) => g.accounts);
    expect(allAccounts).toHaveLength(1);
    expect(allAccounts[0]?.source_name).toBe('Medium');
  });
});

// ─── targetAccounts ─────────────────────────────────────────────────────────

describe('useValidationScreenViewModel.targetAccounts', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [];
    mockStoreState.confidenceFilter = null;
  });

  it('returns empty array when targetData is empty', () => {
    mockStoreState.targetData = [];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    expect(result.current.targetAccounts).toEqual([]);
  });

  it('extracts name and number from targetData rows', () => {
    mockStoreState.targetData = [
      { account_name: 'Cash', account_number: '1000' },
      { account_name: 'Revenue', account_number: '4000' },
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    expect(result.current.targetAccounts).toEqual(
      expect.arrayContaining([
        { name: 'Cash', number: '1000' },
        { name: 'Revenue', number: '4000' },
      ]),
    );
  });

  it('deduplicates entries with the same name', () => {
    mockStoreState.targetData = [
      { account_name: 'Cash', account_number: '1000' },
      { account_name: 'Cash', account_number: '1001' }, // duplicate name
      { account_name: 'Revenue', account_number: '4000' },
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    expect(result.current.targetAccounts).toHaveLength(2);
    expect(result.current.targetAccounts.map((a) => a.name)).toEqual(['Cash', 'Revenue']);
  });

  it('returns empty number string when no number column is found', () => {
    mockStoreState.targetData = [
      { account_name: 'Cash' }, // no number column
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    expect(result.current.targetAccounts).toEqual([{ name: 'Cash', number: '' }]);
  });

  it('sorts targetAccounts alphabetically by name', () => {
    mockStoreState.targetData = [
      { account_name: 'Zebra Account', account_number: '9000' },
      { account_name: 'Alpha Account', account_number: '1000' },
      { account_name: 'Middle Account', account_number: '5000' },
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    expect(result.current.targetAccounts.map((a) => a.name)).toEqual([
      'Alpha Account',
      'Middle Account',
      'Zebra Account',
    ]);
  });

  it('filters out blank names from targetData', () => {
    mockStoreState.targetData = [
      { account_name: 'Cash', account_number: '1000' },
      { account_name: '', account_number: '0000' },
      { account_name: '   ', account_number: '0001' },
    ];
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );
    expect(result.current.targetAccounts).toHaveLength(1);
    expect(result.current.targetAccounts[0]?.name).toBe('Cash');
  });
});

// ─── handleAccountNameChange with targetNumber ───────────────────────────────

describe('useValidationScreenViewModel.handleAccountNameChange', () => {
  const projectId = 'proj-1';
  const navigateBack = jest.fn();
  const navigateForward = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.groupedMappings = [];
    mockStoreState.confidenceFilter = null;
  });

  it('calls updateAccountName with targetNumber when provided', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleAccountNameChange(
        'Asset',
        0,
        'Cash and Bank',
        'Cash',
        'suggestion-1',
        '1234',
      );
    });

    expect(mockStoreState.updateAccountName).toHaveBeenCalledWith(
      'Asset',
      0,
      'Cash and Bank',
      'User',
      'Cash',
      'suggestion-1',
      '1234',
    );
  });

  it('calls updateAccountName with null targetNumber when clearing selection', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleAccountNameChange('Asset', 0, '', 'Cash', undefined, null);
    });

    expect(mockStoreState.updateAccountName).toHaveBeenCalledWith(
      'Asset',
      0,
      '',
      'User',
      'Cash',
      undefined,
      null,
    );
  });

  it('calls updateAccountName without targetNumber when arg is omitted', () => {
    const { result } = renderHook(
      () => useValidationScreenViewModel(projectId, navigateBack, navigateForward, jest.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleAccountNameChange('Asset', 0, 'New Name');
    });

    expect(mockStoreState.updateAccountName).toHaveBeenCalledWith(
      'Asset',
      0,
      'New Name',
      'User',
      undefined,
      undefined,
      undefined,
    );
  });
});

