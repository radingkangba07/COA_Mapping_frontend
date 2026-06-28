// Presentational branch tests for FetchFromErpStep (DA-52 / DA-155). Each render
// drives the component with explicit props for one lifecycle state and asserts
// the right testIDs render and the callbacks fire.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { CoaRow, RequestStatus } from '@/features/projects/types/project-scope.types';

// config/theme is not globally mocked; mirror MCPConnectionPanel.test conventions.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
    destructive: '#DC2626',
    success: '#16A34A',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { FetchFromErpStep } from '../FetchFromErpStep';

const SAMPLE_ROW: CoaRow = {
  accountCode: '1000',
  accountName: 'Cash',
  accountType: 'Asset',
  parent: null,
};

interface RenderOverrides {
  connectionReady?: boolean;
  status?: RequestStatus;
  progress?: number;
  counts?: { source: number; target: number };
  sampleSource?: readonly CoaRow[];
  sampleTarget?: readonly CoaRow[];
  errorMessage?: string | null;
  onFetch?: () => void;
  onRefetch?: () => void;
  onUseCsvFallback?: () => void;
}

function renderStep(overrides: RenderOverrides = {}): {
  onFetch: jest.Mock;
  onRefetch: jest.Mock;
  onUseCsvFallback: jest.Mock;
} {
  const onFetch = (overrides.onFetch as jest.Mock) ?? jest.fn();
  const onRefetch = (overrides.onRefetch as jest.Mock) ?? jest.fn();
  const onUseCsvFallback =
    (overrides.onUseCsvFallback as jest.Mock) ?? jest.fn();

  render(
    <FetchFromErpStep
      sourceErpName="SAP"
      targetErpName="NetSuite"
      connectionReady={overrides.connectionReady ?? true}
      status={overrides.status ?? 'idle'}
      progress={overrides.progress ?? 0}
      counts={overrides.counts ?? { source: 0, target: 0 }}
      sampleSource={overrides.sampleSource ?? []}
      sampleTarget={overrides.sampleTarget ?? []}
      errorMessage={overrides.errorMessage ?? null}
      onFetch={onFetch}
      onRefetch={onRefetch}
      onUseCsvFallback={onUseCsvFallback}
      testID="fetch-from-erp-step"
    />,
  );

  return { onFetch, onRefetch, onUseCsvFallback };
}

describe('FetchFromErpStep — gated', () => {
  it('renders the gated notice and a disabled fetch button', () => {
    const { onFetch } = renderStep({ connectionReady: false });

    expect(screen.getByTestId('fetch-from-erp-step-gated')).toBeTruthy();

    const fetchButton = screen.getByTestId('fetch-from-erp-step-fetch-button');
    expect(fetchButton.props.accessibilityState?.disabled).toBe(true);

    // Pressing a disabled button must not invoke the handler.
    fireEvent.press(fetchButton);
    expect(onFetch).not.toHaveBeenCalled();
  });
});

describe('FetchFromErpStep — idle', () => {
  it('fires onFetch and onUseCsvFallback from their controls', () => {
    const { onFetch, onUseCsvFallback } = renderStep({ status: 'idle' });

    fireEvent.press(screen.getByTestId('fetch-from-erp-step-fetch-button'));
    expect(onFetch).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('fetch-from-erp-step-csv-fallback'));
    expect(onUseCsvFallback).toHaveBeenCalledTimes(1);
  });
});

describe('FetchFromErpStep — loading', () => {
  it('renders the loading block with the progress value', () => {
    renderStep({ status: 'loading', progress: 40 });

    expect(screen.getByTestId('fetch-from-erp-step-loading')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
  });
});

describe('FetchFromErpStep — success', () => {
  it('renders counts + source sample and fires onRefetch', () => {
    const { onRefetch } = renderStep({
      status: 'success',
      counts: { source: 3, target: 2 },
      sampleSource: [SAMPLE_ROW],
    });

    expect(screen.getByTestId('fetch-from-erp-step-success')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByTestId('fetch-from-erp-step-sample-source')).toBeTruthy();

    fireEvent.press(screen.getByTestId('fetch-from-erp-step-refetch-button'));
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('FetchFromErpStep — error', () => {
  it('shows the error message and retries via onRefetch', () => {
    const { onRefetch } = renderStep({
      status: 'error',
      errorMessage: 'Connection refused',
    });

    expect(screen.getByTestId('fetch-from-erp-step-error')).toBeTruthy();
    expect(screen.getByText('Connection refused')).toBeTruthy();

    fireEvent.press(screen.getByTestId('fetch-from-erp-step-retry-button'));
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });
});
