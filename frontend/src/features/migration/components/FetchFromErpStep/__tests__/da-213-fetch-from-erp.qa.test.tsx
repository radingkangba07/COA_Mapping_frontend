// DA-213 (AC: DA-175) — QA: "Fetch from ERP" wizard step (replaces Upload).
// Component test — the Fetch step lives deep in the migration wizard, so its
// lifecycle (gating, fetch → progress, success counts + sample preview, refetch,
// error + retry, CSV fallback) is verified at the component level.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { CoaRow, RequestStatus } from '@/features/projects/types/project-scope.types';

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

import { FetchFromErpStep } from '../FetchFromErpStep';

const SAMPLE_SOURCE: CoaRow[] = [
  { accountCode: '1000', accountName: 'Cash', accountType: 'Asset', parent: null },
  { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'Liability', parent: null },
];
const SAMPLE_TARGET: CoaRow[] = [
  { accountCode: 'A-100', accountName: 'Bank', accountType: 'Asset', parent: null },
];

interface Overrides {
  connectionReady?: boolean;
  status?: RequestStatus;
  progress?: number;
  counts?: { source: number; target: number };
  sampleSource?: readonly CoaRow[];
  sampleTarget?: readonly CoaRow[];
  errorMessage?: string | null;
  onFetch?: jest.Mock;
  onRefetch?: jest.Mock;
  onUseCsvFallback?: jest.Mock;
}

function renderStep(o: Overrides = {}) {
  const onFetch = o.onFetch ?? jest.fn();
  const onRefetch = o.onRefetch ?? jest.fn();
  const onUseCsvFallback = o.onUseCsvFallback ?? jest.fn();
  render(
    <FetchFromErpStep
      sourceErpName="Xero"
      targetErpName="NetSuite ERP"
      connectionReady={o.connectionReady ?? true}
      status={o.status ?? 'idle'}
      progress={o.progress ?? 0}
      counts={o.counts ?? { source: 0, target: 0 }}
      sampleSource={o.sampleSource ?? []}
      sampleTarget={o.sampleTarget ?? []}
      errorMessage={o.errorMessage ?? null}
      onFetch={onFetch}
      onRefetch={onRefetch}
      onUseCsvFallback={onUseCsvFallback}
      testID="fetch-from-erp-step"
    />,
  );
  return { onFetch, onRefetch, onUseCsvFallback };
}

describe('DA-213 Fetch-from-ERP step', () => {
  // TC-01 — Gating: connection must be tested before any fetch is allowed
  it('gates fetching until the connection is ready', () => {
    renderStep({ connectionReady: false });
    expect(screen.getByTestId('fetch-from-erp-step-gated')).toBeTruthy();
    expect(
      screen.getByTestId('fetch-from-erp-step-fetch-button').props.accessibilityState?.disabled,
    ).toBe(true);
  });

  // TC-02 — Idle: the Fetch control fires onFetch (this step replaces the upload cards)
  it('fires onFetch from the Fetch button when ready', () => {
    const { onFetch } = renderStep({ status: 'idle' });
    fireEvent.press(screen.getByTestId('fetch-from-erp-step-fetch-button'));
    expect(onFetch).toHaveBeenCalledTimes(1);
  });

  // TC-03 — Loading: a progress indicator shows (and NO "0 of 1 uploaded" copy remains)
  it('shows a progress indicator while fetching, without upload copy', () => {
    renderStep({ status: 'loading', progress: 40 });
    const loading = screen.getByTestId('fetch-from-erp-step-loading');
    expect(loading).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.queryByText(/uploaded/i)).toBeNull();
  });

  // TC-04 — Success: row counts + sample preview tables (source and target)
  it('renders row counts and sample preview on success', () => {
    renderStep({
      status: 'success',
      counts: { source: 120, target: 80 },
      sampleSource: SAMPLE_SOURCE,
      sampleTarget: SAMPLE_TARGET,
    });
    expect(screen.getByTestId('fetch-from-erp-step-success')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('80')).toBeTruthy();
    expect(screen.getByTestId('fetch-from-erp-step-sample-source')).toBeTruthy();
    expect(screen.getByTestId('fetch-from-erp-step-sample-target')).toBeTruthy();
  });

  // TC-05 — Refetch: the Re-fetch control reloads the data
  it('fires onRefetch from the Re-fetch button', () => {
    const { onRefetch } = renderStep({ status: 'success', counts: { source: 1, target: 1 }, sampleSource: SAMPLE_SOURCE });
    fireEvent.press(screen.getByTestId('fetch-from-erp-step-refetch-button'));
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });

  // TC-06 — Error: clear error state with a Retry that reloads
  it('shows an error state with a working Retry', () => {
    const { onRefetch } = renderStep({ status: 'error', errorMessage: 'Could not reach the MCP server' });
    expect(screen.getByTestId('fetch-from-erp-step-error')).toBeTruthy();
    expect(screen.getByText('Could not reach the MCP server')).toBeTruthy();
    fireEvent.press(screen.getByTestId('fetch-from-erp-step-retry-button'));
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });

  // TC-07 — CSV fallback: the user can drop back to the CSV upload flow (regression)
  it('offers a CSV-upload fallback affordance', () => {
    const { onUseCsvFallback } = renderStep({ status: 'idle' });
    fireEvent.press(screen.getByTestId('fetch-from-erp-step-csv-fallback'));
    expect(onUseCsvFallback).toHaveBeenCalledTimes(1);
  });
});
