import React from 'react';
import { View } from 'react-native';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FieldMappingScreen } from '../FieldMappingScreen';
import { WizardRightPanelContext } from '../../context/wizardRightPanel.context';
import { useMappingScreenStore } from '../../store/mappingScreen.store';
import { buildEntityKey, useWizardStore } from '../../store/wizard.store';
import { STEPS, getStep } from '../../utils/taxonomy';
import { ok } from '@/shared/types/result.types';
import itemsFixture from '../../dp-kit/fixtures/items.entity.json';
import customersFixture from '../../dp-kit/fixtures/customers.entity.json';

// This screen's own data now comes from the real column-mappings load
// (DA-401), which the fixture-shaped mock below bypasses at the service
// layer — mocking getColumnMappings directly to return each fixture's
// already-EntityMapping-shaped `.mapping` block keeps every assertion
// below unchanged (they were written against these exact fixtures) while
// genuinely exercising useMappingData's own query/enabled/unwrap plumbing.
// mapping.service.ts's own DTO->EntityMapping mapper has its own
// dedicated test (mapping.service.test.ts) — not re-exercised here.
const mockGetColumnMappings = jest.fn();
// pipelineRunId is set for every test below (beforeEach), so any
// approval confirm() reaches these real network calls — stubbed to a
// no-op success so the header's "Accept N high-confidence" test can
// press through the approval modal without a real HTTP layer.
const mockBulkAcceptColumnMappings = jest.fn();
const mockPatchColumnMapping = jest.fn();
jest.mock('../../services/mapping.service', () => ({
  getColumnMappings: (...args: unknown[]) => mockGetColumnMappings(...args),
  bulkAcceptColumnMappings: (...args: unknown[]) => mockBulkAcceptColumnMappings(...args),
  patchColumnMapping: (...args: unknown[]) => mockPatchColumnMapping(...args),
}));

const FIXTURE_BY_RUN_ID: Record<string, unknown> = {
  'run-items': (itemsFixture as { mapping: unknown }).mapping,
  'run-customers': (customersFixture as { mapping: unknown }).mapping,
};

// MappingFilterDropdown's Select opens via triggerRef.measureInWindow(cb);
// the test renderer never invokes it, so patch it to fire synchronously
// (same fix as ConnectionMethodSelect.test/MemberAddControl.test).
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

function renderScreen(props: React.ComponentProps<typeof FieldMappingScreen> = {}): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FieldMappingScreen {...props} />
    </QueryClientProvider>,
  );
}

describe('FieldMappingScreen', () => {
  beforeEach(() => {
    useMappingScreenStore.getState().reset();
    useWizardStore.getState().reset();
    useWizardStore.getState().setPipelineRunId('items', 'run-items');
    useWizardStore.getState().setPipelineRunId('customers', 'run-customers');
    mockGetColumnMappings.mockImplementation((_client: unknown, runId: string) =>
      Promise.resolve(ok({ mapping: FIXTURE_BY_RUN_ID[runId], bookmarkedIds: new Set() })),
    );
    mockBulkAcceptColumnMappings.mockReset().mockResolvedValue(ok(undefined));
    mockPatchColumnMapping.mockReset().mockResolvedValue(ok(undefined));
  });

  it('renders the Field Mapping header, readiness banner and KPI cards from the items fixture', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeTruthy();
    });

    expect(screen.getByText(`Step ${getStep('mapping').n} of ${STEPS.length}`)).toBeTruthy();
    expect(screen.getByTestId('mapping-readiness')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-high')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-review')).getByText('4')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-none')).getByText('17')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-missing')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-excluded')).getByText('21')).toBeTruthy();
    expect(screen.queryByTestId('mapping-visual-filters')).toBeNull();
    expect(within(screen.getByTestId('mapping-filter-trigger')).getByText('All fields')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-filter-trigger')).getByText('46')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-f1')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-f15')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-row-f16')).toBeNull();
    expect(screen.getByTestId('mapping-table-page-4')).toBeTruthy();
  });

  it('DA-401: falls back to the client-derived readiness banner when the real backend response has no readiness block at all', async () => {
    // Real `getColumnMappings` never sets `readiness` (see mapping.service.ts's
    // own doc comment) — mirror that shape exactly, unlike every other test
    // here which uses the fixture's own (readiness-bearing) mapping block.
    mockGetColumnMappings.mockImplementation(() =>
      Promise.resolve(
        ok({
          mapping: {
            proposals: [
              { id: 'p1', name: 'A', status: 'Blocked' },
              { id: 'p2', name: 'B', status: 'Review required' },
            ],
            cards: [
              { id: 'review', label: 'Needs review', statuses: ['Review required'] },
              { id: 'none', label: 'No safe target', statuses: ['Blocked'] },
            ],
          },
          bookmarkedIds: new Set(),
        }),
      ),
    );
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('mapping-readiness')).toBeTruthy();
    });
    expect(screen.getByText('Needs attention before continuing')).toBeTruthy();
    expect(screen.getByText('1 field has no safe target, and 1 more needs review.')).toBeTruthy();
  });

  it('shows "Accept N high-confidence" in the header (reference: pageHeader\'s bulkApprove button, not an in-table banner) and accepts them all as one bulk decision', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('mapping-accept-high-confidence')).toBeTruthy();
    });
    // Real items fixture: f3/f4/f7 are the only Suggested rows with a proposed target.
    expect(within(screen.getByTestId('mapping-accept-high-confidence')).getByText('Accept 3 high-confidence')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-accept-high-confidence'));

    const pending = useWizardStore.getState().pendingApproval;
    expect(pending).toEqual(
      expect.objectContaining({ entityId: 'items', fieldId: '', reason: 'bulk-accept', proposedTargetId: null, previousTargetId: null }),
    );
    expect((pending?.bulkFields ?? []).map((f) => f.fieldId).sort()).toEqual(['f3', 'f4', 'f7']);
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);

    fireEvent.press(screen.getByTestId('mapping-table-approval-apply'));

    const decisions = useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? [];
    expect(decisions).toHaveLength(3);
    expect(decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'f3', status: 'accepted', targetId: 'default_code' }),
        expect.objectContaining({ fieldId: 'f4', status: 'accepted', targetId: 'name' }),
        expect.objectContaining({ fieldId: 'f7', status: 'accepted', targetId: 'description_purchase' }),
      ]),
    );
  });

  it('hides "Accept N high-confidence" once nothing qualifies', async () => {
    mockGetColumnMappings.mockImplementation(() =>
      Promise.resolve(
        ok({ mapping: { proposals: [{ id: 'p1', name: 'Only Row', status: 'Excluded' }], cards: [] }, bookmarkedIds: new Set() }),
      ),
    );
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeTruthy();
    });
    expect(screen.queryByTestId('mapping-accept-high-confidence')).toBeNull();
  });

  it('picking a filter-dropdown option sets the same cardFilter a KPI card click would, and stays in sync with it', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('mapping-filter-trigger')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('mapping-filter-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('mapping-filter-option-high')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('mapping-filter-option-high'));

    await waitFor(() => {
      expect(within(screen.getByTestId('mapping-filter-trigger')).getByText('High confidence')).toBeTruthy();
    });
    // Same `cardFilter` — the KPI card and the visual-filters chip agree.
    expect(within(screen.getByTestId('mapping-visual-filters')).getByText('High confidence')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-filter-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('mapping-filter-option-all')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('mapping-filter-option-all'));

    await waitFor(() => {
      expect(within(screen.getByTestId('mapping-filter-trigger')).getByText('All fields')).toBeTruthy();
    });
    expect(screen.queryByTestId('mapping-visual-filters')).toBeNull();
  });

  it('toggles a KPI card as the active visual filter and clears it', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('mapping-kpi-high')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('mapping-kpi-high'));
    await waitFor(() => {
      expect(within(screen.getByTestId('mapping-visual-filters')).getByText('High confidence')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('mapping-visual-filters-clear'));
    await waitFor(() => {
      expect(screen.queryByTestId('mapping-visual-filters')).toBeNull();
    });
  });

  it('shows the Back button only when a back handler is available, and calls it on press', async () => {
    const onBack = jest.fn();
    renderScreen({ onBack });

    await waitFor(() => {
      expect(screen.getByTestId('mapping-back')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('mapping-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hides the Back button when no back handler is available', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeTruthy();
    });

    expect(screen.queryByTestId('mapping-back')).toBeNull();
  });

  it('shows the Continue button only when onContinue is provided, labelled from the taxonomy\'s next step, and calls it on press', async () => {
    const onContinue = jest.fn();
    renderScreen({ onContinue });

    await waitFor(() => {
      expect(screen.getByTestId('mapping-continue')).toBeTruthy();
    });
    // Reference: continueLabel = 'Continue to ' + DP_TAX.steps[3].label —
    // read from the taxonomy (Value Mapping), not hardcoded.
    expect(within(screen.getByTestId('mapping-continue')).getByText('Continue to Value Mapping')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('hides the Continue button when onContinue is not provided', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeTruthy();
    });

    expect(screen.queryByTestId('mapping-continue')).toBeNull();
  });

  it("renders the customers fixture's own (smaller) mapping block", async () => {
    renderScreen({ entityId: 'customers' });

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeTruthy();
    });

    expect(screen.getByTestId('mapping-readiness')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-high')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-review')).getByText('4')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-none')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-missing')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-kpi-excluded')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-filter-trigger')).getByText('10')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-c1')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-cm1')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-prev')).toBeNull();
  });

  it('the KPI card click and the table row set stay in sync (same cardFilter)', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('mapping-kpi-high')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('mapping-kpi-high'));
    await waitFor(() => {
      expect(screen.getByTestId('mapping-table-row-f3')).toBeTruthy();
    });
    expect(screen.getByTestId('mapping-table-row-f4')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-f7')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-row-f1')).toBeNull();
  });

  it('never wraps itself in a second MigrationLayout, registering the Copilot panel into the shared rightPanel slot instead', async () => {
    const setRightPanel = jest.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <WizardRightPanelContext.Provider value={setRightPanel}>
          <FieldMappingScreen />
        </WizardRightPanelContext.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeTruthy();
    });

    // Regression guard: this screen used to self-wrap in a second
    // MigrationLayout (testID "master-data-mapping-screen") whenever
    // parentProjectId was set, rendering a duplicate sidebar.
    expect(screen.queryByTestId('master-data-mapping-screen')).toBeNull();

    await waitFor(() => {
      expect(setRightPanel).toHaveBeenLastCalledWith(expect.anything());
    });
    expect(setRightPanel.mock.calls.at(-1)?.[0]).not.toBeNull();

    unmount();
    expect(setRightPanel).toHaveBeenLastCalledWith(null);
  });
});
