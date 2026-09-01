import React from 'react';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SourceDataProfileScreen } from '../SourceDataProfileScreen';
import { useSourceProfileStore } from '../../store/sourceProfile.store';
import { STEPS, getStep } from '../../utils/taxonomy';

// This screen mounts KpiStrip + FieldsTable (34 fields) + FieldDetailDrawer
// + CompareSelectionBar + ApprovalModal + CopilotPanelShell together — the
// default 5s per-test budget is comfortably enough for a single component's
// own tests, but a fireEvent + waitFor round trip through this much combined
// tree can occasionally cross it under load. 15s matches this suite's actual
// render cost rather than papering over a real hang.
jest.setTimeout(15000);

function renderScreen(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SourceDataProfileScreen />
    </QueryClientProvider>,
  );
}

describe('SourceDataProfileScreen', () => {
  beforeEach(() => {
    useSourceProfileStore.getState().reset();
  });

  it('renders the page header, KPI strip and field table from the items fixture', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Source Data Profile')).toBeTruthy();
    });

    expect(screen.getByText(`Step ${getStep('profile').n} of ${STEPS.length}`)).toBeTruthy();
    expect(within(screen.getByTestId('source-profile-kpi-records')).getByText('42,580')).toBeTruthy();
    expect(screen.getByText('SKU')).toBeTruthy();
    expect(screen.getByText(/Showing 1.30 of 33 fields/)).toBeTruthy();
  });

  it('expands the readiness banner to reveal recommended-order chips and evidence', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-readiness-toggle')).toBeTruthy();
    });

    expect(screen.queryByText('Resolve duplicate SKUs')).toBeNull();

    fireEvent.press(screen.getByTestId('source-profile-readiness-toggle'));

    await waitFor(() => {
      expect(screen.getByText('Resolve duplicate SKUs')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('source-profile-readiness-evidence-toggle'));

    await waitFor(() => {
      expect(screen.getByText('duplicate SKU rows')).toBeTruthy();
    });
  });

  it('opens the field detail drawer for a row and closes it', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-table-open-sku')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('source-profile-table-open-sku'));

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-drawer-close')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('source-profile-drawer-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('source-profile-drawer-close')).toBeNull();
    });
  });

  it('shows the 4 fixed drawer tabs (matching the reference tab bar, "AI interpretation" intentionally empty) and keeps the active tab across prev/next navigation', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-table-open-sku')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('source-profile-table-open-sku'));

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-drawer-tab-overview')).toBeTruthy();
    });
    expect(screen.getByTestId('source-profile-drawer-tab-distribution')).toBeTruthy();
    expect(screen.getByTestId('source-profile-drawer-tab-issues')).toBeTruthy();
    expect(screen.getByTestId('source-profile-drawer-tab-ai')).toBeTruthy();

    fireEvent.press(screen.getByTestId('source-profile-drawer-tab-ai'));
    await waitFor(() => {
      expect(screen.getByTestId('source-profile-drawer-tab-ai-content')).toBeTruthy();
    });
    expect(screen.getByTestId('source-profile-drawer-tab-ai-content').children).toHaveLength(0);

    fireEvent.press(screen.getByTestId('source-profile-drawer-tab-distribution'));

    fireEvent.press(screen.getByTestId('source-profile-drawer-next'));

    // Field changed (drawer now shows the next field, "name"), but the
    // active tab must stay on Distribution — reference's drawerNav never
    // resets drawerTab, unlike a naive per-field-id reset would.
    await waitFor(() => {
      expect(useSourceProfileStore.getState().openFieldId).toBe('name');
    });
    const distributionTab = screen.getByTestId('source-profile-drawer-tab-distribution');
    expect(distributionTab.props.accessibilityState?.selected).toBe(true);
  });

  it('clicking a KPI tile shows the Visual filters chip without narrowing the table, and clearing it removes the chip', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-kpi-dupes')).toBeTruthy();
    });

    // The KPI strip's own filter is independent of the field-filter
    // dropdown's categoryFilter — clicking a tile highlights/dims rows,
    // it never hides them (matches the reference's `filterIds`-driven
    // `dim`/`highlighted` row states, not a `matchesCategory` narrowing).
    fireEvent.press(screen.getByTestId('source-profile-kpi-dupes'));

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-visual-filters')).toBeTruthy();
    });
    expect(within(screen.getByTestId('source-profile-visual-filters')).getByText('Duplicate identifiers')).toBeTruthy();
    expect(screen.getByText(/Showing 1.30 of 33 fields/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('source-profile-visual-filters-clear'));

    await waitFor(() => {
      expect(screen.queryByTestId('source-profile-visual-filters')).toBeNull();
    });
  });

  it('shows the compare bar only once 2 fields are selected, opens the comparison modal, and clears', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('source-profile-table-select-sku')).toBeTruthy();
    });

    expect(screen.queryByText('2 fields selected for comparison')).toBeNull();

    fireEvent.press(screen.getByTestId('source-profile-table-select-sku'));
    expect(screen.queryByText('2 fields selected for comparison')).toBeNull();

    fireEvent.press(screen.getByTestId('source-profile-table-select-name'));

    await waitFor(() => {
      expect(screen.getByText('2 fields selected for comparison')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('source-profile-compare-bar-compare'));

    await waitFor(() => {
      expect(screen.getByText('Field comparison')).toBeTruthy();
    });
    const modal = within(screen.getByTestId('source-profile-compare-modal'));
    expect(modal.getByText('SKU')).toBeTruthy();
    expect(modal.getByText('Product Name')).toBeTruthy();

    fireEvent.press(screen.getByTestId('source-profile-compare-modal-close'));

    await waitFor(() => {
      expect(screen.queryByText('Field comparison')).toBeNull();
    });

    fireEvent.press(screen.getByTestId('source-profile-compare-bar-clear'));

    await waitFor(() => {
      expect(screen.queryByText('2 fields selected for comparison')).toBeNull();
    });
  });

  it('applies an ignore decision through the approval modal, then undoes it cleanly', async () => {
    // The kebab menu is a measureInWindow-anchored popover (same pattern as
    // ProfileCoveragePopover, which has no tests either, for the same
    // reason) — measureInWindow's callback never fires in this test
    // environment, so opening it isn't exercised here. This test instead
    // drives the store directly (exactly what the menu's "Ignore field"
    // item does) and asserts the actually-testable integration: the modal
    // renders the pending approval correctly, Apply records one decision,
    // and undo removes it cleanly with no stale entry left behind — the
    // specific bug the reference itself has that this build avoids.
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('SKU')).toBeTruthy();
    });

    act(() => {
      useSourceProfileStore.getState().openApproval({ kind: 'ignore', fieldId: 'sku' });
    });

    await waitFor(() => {
      expect(screen.getByText('Ignore SKU')).toBeTruthy();
    });
    expect(screen.getByText('100.0% populated')).toBeTruthy();

    fireEvent.press(screen.getByTestId('source-profile-approval-apply'));

    await waitFor(() => {
      expect(screen.queryByText('Ignore SKU')).toBeNull();
    });
    const decisions = useSourceProfileStore.getState().decisions;
    expect(decisions).toHaveLength(1);
    const decision = decisions[0];
    if (!decision) throw new Error('expected one decision');
    expect(decision).toMatchObject({ kind: 'ignore', fieldId: 'sku', label: 'Ignored SKU' });

    useSourceProfileStore.getState().undoDecision(decision.id);
    expect(useSourceProfileStore.getState().decisions).toHaveLength(0);
  });
});
