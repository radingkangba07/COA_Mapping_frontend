import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import type { TestRunDto } from '../../services/test_import.service';

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

/** Build a complete TestRunDto, letting each test override only what it asserts on. */
function makeTestRun(overrides: Partial<TestRunDto>): TestRunDto {
  return {
    id: 'test-run-1',
    run_id: 'run-1',
    status: 'pending',
    rows_attempted: null,
    rows_passed: null,
    rows_failed: null,
    failure_summary: null,
    sample_failures: null,
    error_detail: null,
    created_at: '2026-09-23T10:00:00Z',
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

describe('TestImportScreen', () => {
  beforeEach(() => {
    mockUseTestImport.mockReturnValue({
      testRun: null,
      isLoading: false,
      isTriggering: false,
      error: null,
      triggerRun: jest.fn(),
    });
  });

  it('renders the idle run prompt and no continue button when there is no test run yet', () => {
    render(<TestImportScreen />);

    expect(screen.getByTestId('test-import-run')).toBeTruthy();
    expect(screen.queryByTestId('test-import-continue')).toBeNull();
  });

  it('calls triggerRun when the Run Test Import button is pressed', () => {
    const triggerRun = jest.fn();
    mockUseTestImport.mockReturnValue({
      testRun: null,
      isLoading: false,
      isTriggering: false,
      error: null,
      triggerRun,
    });

    render(<TestImportScreen />);

    fireEvent.press(screen.getByTestId('test-import-run'));
    expect(triggerRun).toHaveBeenCalledTimes(1);
  });

  it('renders a spinner and hides the run button while loading', () => {
    mockUseTestImport.mockReturnValue({
      testRun: null,
      isLoading: true,
      isTriggering: false,
      error: null,
      triggerRun: jest.fn(),
    });

    const { UNSAFE_getByType } = render(<TestImportScreen />);

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(screen.queryByTestId('test-import-run')).toBeNull();
  });

  it('renders the running message while validation is in progress', () => {
    mockUseTestImport.mockReturnValue({
      testRun: makeTestRun({ status: 'running' }),
      isLoading: false,
      isTriggering: false,
      error: null,
      triggerRun: jest.fn(),
    });

    render(<TestImportScreen />);

    expect(screen.getByText('Running validation…')).toBeTruthy();
  });

  it('renders the complete summary with counts, failure breakdown and a Continue action', () => {
    mockUseTestImport.mockReturnValue({
      testRun: makeTestRun({
        status: 'complete',
        rows_attempted: 100,
        rows_passed: 82,
        rows_failed: 18,
        failure_summary: { CustomerID: { required_missing: 3 } },
        sample_failures: [{ row_index: 0, field: 'CustomerID', value: null, reason: 'required_missing' }],
      }),
      isLoading: false,
      isTriggering: false,
      error: null,
      triggerRun: jest.fn(),
    });

    render(<TestImportScreen onContinue={jest.fn()} />);

    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('82')).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('Failure breakdown')).toBeTruthy();
    // `required_missing` appears in both the breakdown rule row and the
    // sample-failures reason column, so match by count rather than uniqueness.
    expect(screen.getAllByText('required_missing').length).toBeGreaterThan(0);
    expect(screen.getByTestId('test-import-continue')).toBeTruthy();
  });

  it('renders the complete all-pass state with a Continue action and no failure breakdown', () => {
    mockUseTestImport.mockReturnValue({
      testRun: makeTestRun({
        status: 'complete',
        rows_attempted: 100,
        rows_passed: 100,
        rows_failed: 0,
        failure_summary: null,
        sample_failures: null,
      }),
      isLoading: false,
      isTriggering: false,
      error: null,
      triggerRun: jest.fn(),
    });

    render(<TestImportScreen onContinue={jest.fn()} />);

    expect(screen.getByTestId('test-import-continue')).toBeTruthy();
    expect(within(screen.getByTestId('test-import-continue')).getByText('Continue')).toBeTruthy();
    expect(screen.queryByText('Failure breakdown')).toBeNull();
  });

  it('renders the failed state with the error detail and a retry action', () => {
    mockUseTestImport.mockReturnValue({
      testRun: makeTestRun({ status: 'failed', error_detail: 'Worker crashed' }),
      isLoading: false,
      isTriggering: false,
      error: null,
      triggerRun: jest.fn(),
    });

    render(<TestImportScreen />);

    expect(screen.getByText('Worker crashed')).toBeTruthy();
    expect(screen.getByTestId('test-import-retry')).toBeTruthy();
  });

  it('shows the Back button only when a back handler is available, and calls it on press', () => {
    const onBack = jest.fn();
    render(<TestImportScreen onBack={onBack} />);

    fireEvent.press(screen.getByTestId('test-import-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the Back button when no back handler is available', () => {
    render(<TestImportScreen />);

    expect(screen.queryByTestId('test-import-back')).toBeNull();
  });

  it('renders the step header from the taxonomy with the step number', () => {
    render(<TestImportScreen />);

    expect(screen.getByText(getStep('test').label)).toBeTruthy();
    expect(screen.getByText(`Step ${getStep('test').n} of ${STEPS.length}`)).toBeTruthy();
  });
});
