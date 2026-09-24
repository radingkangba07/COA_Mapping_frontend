import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ImportRunDto } from '../../services/test_import.service';

jest.mock('../../hooks/useTestImport', () => ({
  useTestImport: jest.fn(),
}));
import { useTestImport } from '../../hooks/useTestImport';
const mockUseTestImport = useTestImport as jest.Mock;

jest.mock('../../store/wizard.store', () => ({
  useWizardStore: (selector: (s: { entityId: string }) => unknown) => selector({ entityId: 'items' }),
}));

import { TestImportScreen } from '../TestImportScreen';
import { STEPS, getStep } from '../../utils/taxonomy';

function makeImportRun(overrides: Partial<ImportRunDto>): ImportRunDto {
  return {
    id: 'ir-1',
    run_id: 'run-1',
    status: 'pending',
    run_code: 'run_ti_0001',
    batch_size: 20,
    req_per_sec: 4,
    rows_attempted: null,
    rows_imported: null,
    rows_failed: null,
    rows_skipped: null,
    rows_reconciled: null,
    duration_ms: null,
    error_detail: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-09-23T10:00:00Z',
    ...overrides,
  };
}

const DEFAULT_HOOK = {
  importRun: null,
  batches: [],
  errors: { items: [], total: 0 },
  records: { items: [], total: 0 },
  connectorRequests: { items: [], total: 0 },
  selectedBatch: null,
  setSelectedBatch: jest.fn(),
  isLoading: false,
  isTriggering: false,
  error: null,
  triggerRun: jest.fn(),
};

describe('TestImportScreen', () => {
  beforeEach(() => {
    mockUseTestImport.mockReturnValue({ ...DEFAULT_HOOK });
  });

  it('renders the idle run prompt when there is no import run yet', () => {
    render(<TestImportScreen />);

    expect(screen.getByTestId('test-import-run')).toBeTruthy();
  });

  it('calls triggerRun when the Start Simulated Import button is pressed', () => {
    const triggerRun = jest.fn();
    mockUseTestImport.mockReturnValue({ ...DEFAULT_HOOK, triggerRun });

    render(<TestImportScreen />);

    fireEvent.press(screen.getByTestId('test-import-run'));
    expect(triggerRun).toHaveBeenCalledTimes(1);
  });

  it('renders a spinner and hides the run button while loading', () => {
    mockUseTestImport.mockReturnValue({ ...DEFAULT_HOOK, isLoading: true });

    const { UNSAFE_getByType } = render(<TestImportScreen />);

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByTestId('test-import-run')).toBeNull();
  });

  it('renders the running message while the import is in progress', () => {
    mockUseTestImport.mockReturnValue({
      ...DEFAULT_HOOK,
      importRun: makeImportRun({ status: 'running' }),
    });

    render(<TestImportScreen />);

    expect(screen.getByText('Running simulated import…')).toBeTruthy();
  });

  it('renders the complete two-panel layout with stat strip and tabs', () => {
    mockUseTestImport.mockReturnValue({
      ...DEFAULT_HOOK,
      importRun: makeImportRun({
        status: 'complete',
        rows_attempted: 102,
        rows_imported: 96,
        rows_failed: 4,
        rows_skipped: 2,
        rows_reconciled: 96,
        duration_ms: 58000,
      }),
      errors: { items: [], total: 4 },
      records: { items: [], total: 20 },
      connectorRequests: { items: [], total: 16 },
    });

    render(<TestImportScreen onContinue={jest.fn()} />);

    expect(screen.getAllByText('102').length).toBeGreaterThan(0);
    expect(screen.getAllByText('96').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByTestId('tab-errors')).toBeTruthy();
    expect(screen.getByTestId('tab-records')).toBeTruthy();
    expect(screen.getByTestId('tab-connectors')).toBeTruthy();
    expect(screen.getByTestId('batch-item-all')).toBeTruthy();
  });

  it('renders the unresolved failures banner when rows_failed > 0', () => {
    mockUseTestImport.mockReturnValue({
      ...DEFAULT_HOOK,
      importRun: makeImportRun({
        status: 'complete',
        rows_attempted: 102,
        rows_imported: 96,
        rows_failed: 4,
        rows_skipped: 2,
        rows_reconciled: 96,
      }),
    });

    render(<TestImportScreen />);

    expect(screen.getByText('Test batch has unresolved failures  ')).toBeTruthy();
  });

  it('renders the failed state with error detail and retry action', () => {
    mockUseTestImport.mockReturnValue({
      ...DEFAULT_HOOK,
      importRun: makeImportRun({ status: 'failed', error_detail: 'Worker crashed' }),
    });

    render(<TestImportScreen />);

    expect(screen.getByText('Worker crashed')).toBeTruthy();
    expect(screen.getByTestId('test-import-retry')).toBeTruthy();
  });

  it('shows the Back button only when a back handler is provided', () => {
    const onBack = jest.fn();
    render(<TestImportScreen onBack={onBack} />);

    fireEvent.press(screen.getByTestId('test-import-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the Back button when no back handler is provided', () => {
    render(<TestImportScreen />);

    expect(screen.queryByTestId('test-import-back')).toBeNull();
  });

  it('renders the Proceed to Import button (always visible in header)', () => {
    render(<TestImportScreen />);

    expect(screen.getByTestId('test-import-proceed')).toBeTruthy();
  });

  it('renders the step header from the taxonomy', () => {
    render(<TestImportScreen />);

    expect(screen.getByText(getStep('test').label)).toBeTruthy();
    expect(screen.getByText(`Step ${getStep('test').n} of ${STEPS.length}`)).toBeTruthy();
  });

  it('filters the batch sidebar when a batch is selected', () => {
    const setSelectedBatch = jest.fn();
    mockUseTestImport.mockReturnValue({
      ...DEFAULT_HOOK,
      importRun: makeImportRun({ status: 'complete', rows_attempted: 20 }),
      batches: [
        { batch_code: 'batch_01', records_total: 20, records_imported: 20, records_failed: 0, records_skipped: 0, errors_open: 0 },
      ],
      selectedBatch: null,
      setSelectedBatch,
    });

    render(<TestImportScreen />);

    fireEvent.press(screen.getByTestId('batch-item-batch_01'));
    expect(setSelectedBatch).toHaveBeenCalledWith('batch_01');
  });
});
