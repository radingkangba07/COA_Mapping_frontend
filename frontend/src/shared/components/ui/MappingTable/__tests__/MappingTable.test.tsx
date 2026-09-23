import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent, within, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MappingTable } from '../MappingTable';
import { useMappingScreenStore } from '@/features/master-data-wizard/store/mappingScreen.store';
import { buildEntityKey, useWizardStore } from '@/features/master-data-wizard/store/wizard.store';
import { getEntityPack } from '@/features/master-data-wizard/services/entity-pack.service';
import type { EntityId, EntityMapping } from '@/features/master-data-wizard/dp-kit/types/entity';

// The Proposed Target column's edit view embeds a `Select`, which opens
// via triggerRef.measureInWindow(cb) — patch it to fire synchronously,
// same fix as FieldMappingScreen.test.tsx/ConnectionMethodSelect.test.
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

async function loadMapping(entityId: 'items' | 'customers'): Promise<EntityMapping | undefined> {
  const result = await getEntityPack(entityId);
  if (!result.ok) throw new Error(`fixture failed to load: ${entityId}`);
  return result.data.mapping;
}

function cellWidth(testId: string): number | undefined {
  const el = screen.getByTestId(testId);
  const style = (el.props as { style?: unknown }).style;
  const flat = (Array.isArray(style) ? style : [style]).flat(Infinity) as unknown[];
  for (const s of flat) {
    if (s !== null && typeof s === 'object' && 'width' in s) {
      return (s as { width?: number }).width;
    }
  }
  return undefined;
}

function rowIds(): string[] {
  return screen
    .getAllByTestId(/^mapping-table-row-/)
    .map((el) => (el.props as { testID: string }).testID.replace('mapping-table-row-', ''));
}

function renderTable(mapping: EntityMapping | undefined, entityId: EntityId = 'items'): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MappingTable entityId={entityId} mapping={mapping} testID="mapping-table" />
    </QueryClientProvider>,
  );
}

describe('MappingTable', () => {
  beforeEach(() => {
    useMappingScreenStore.getState().reset();
    useWizardStore.getState().reset();
  });

  it('renders page 1 of the real items fixture (15 of 46 rows) with pagination', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping);

    expect(screen.getByTestId('mapping-table-row-f1')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-f15')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-row-f16')).toBeNull();
    expect(within(screen.getByTestId('mapping-table')).getByText('46')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-page-1')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-page-4')).toBeTruthy();
  });

  it('shows the second page of results on Next, and moves back on Prev', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping);

    fireEvent.press(screen.getByTestId('mapping-table-next'));
    expect(screen.getByTestId('mapping-table-row-f16')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-row-f1')).toBeNull();

    fireEvent.press(screen.getByTestId('mapping-table-prev'));
    expect(screen.getByTestId('mapping-table-row-f1')).toBeTruthy();
  });

  it('renders every row for the customers fixture without pagination (10 rows, 1 page)', async () => {
    const mapping = await loadMapping('customers');
    renderTable(mapping);

    expect(screen.getByTestId('mapping-table-row-c1')).toBeTruthy();
    expect(screen.getByTestId('mapping-table-row-cm1')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-prev')).toBeNull();
  });

  it('narrows rows to the active card filter (hard filter, not a dim)', async () => {
    const mapping = await loadMapping('items');
    act(() => {
      useMappingScreenStore.getState().pickCardFilter('high');
    });
    renderTable(mapping);

    expect(rowIds().sort()).toEqual(['f3', 'f4', 'f7']);
    expect(screen.queryByTestId('mapping-table-prev')).toBeNull();
  });

  it('cycles Source-field sort asc -> desc -> unsorted on repeated clicks', async () => {
    const mapping = await loadMapping('items');
    act(() => {
      useMappingScreenStore.getState().pickCardFilter('high');
    });
    renderTable(mapping);

    // Natural (unsorted) order matches the fixture's own array order.
    expect(rowIds()).toEqual(['f3', 'f4', 'f7']);

    fireEvent.press(screen.getByTestId('mapping-table-sort-name'));
    expect(rowIds()).toEqual(['f4', 'f3', 'f7']); // Display Name < Name < Purchase Description

    fireEvent.press(screen.getByTestId('mapping-table-sort-name'));
    expect(rowIds()).toEqual(['f7', 'f3', 'f4']);

    fireEvent.press(screen.getByTestId('mapping-table-sort-name'));
    expect(rowIds()).toEqual(['f3', 'f4', 'f7']);
  });

  it('toggles a single row and select-all-on-page through the store', async () => {
    const mapping = await loadMapping('items');
    act(() => {
      useMappingScreenStore.getState().pickCardFilter('high');
    });
    renderTable(mapping);

    fireEvent.press(screen.getByTestId('mapping-table-select-f3'));
    expect(useMappingScreenStore.getState().selected).toEqual({ f3: true });

    fireEvent.press(screen.getByTestId('mapping-table-select-all'));
    expect(useMappingScreenStore.getState().selected).toEqual({ f3: true, f4: true, f7: true });

    fireEvent.press(screen.getByTestId('mapping-table-select-all'));
    expect(useMappingScreenStore.getState().selected).toEqual({});
  });

  it('shows the "no fields match" empty state and clears the filter on press', () => {
    // Hand-built minimal mapping: a card whose statuses match nothing in
    // proposals — not reachable via either real fixture (every real card
    // has >=1 row), but a real, reachable state MappingTable must still
    // handle correctly.
    const mapping: EntityMapping = {
      proposals: [{ id: 'p1', name: 'Only Row', status: 'Suggested' }],
      cards: [{ id: 'missing', label: 'Missing required targets', statuses: ['Nonexistent status'] }],
    };
    act(() => {
      useMappingScreenStore.getState().pickCardFilter('missing');
    });
    renderTable(mapping);

    expect(screen.getByTestId('mapping-table-empty')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-row-p1')).toBeNull();

    fireEvent.press(within(screen.getByTestId('mapping-table-empty')).getByText('Clear filter'));
    expect(useMappingScreenStore.getState().cardFilter).toBeNull();
  });

  it('shows the resolved target label/dtype/handoff chip in the read view', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping);

    const f3Target = screen.getByTestId('mapping-table-target-f3');
    expect(within(f3Target).getByText('Internal Reference')).toBeTruthy();
    expect(within(f3Target).getByText('Char')).toBeTruthy();
    expect(within(f3Target).getByText('Ready')).toBeTruthy();

    // f1 has no proposed target at all.
    const f1Target = screen.getByTestId('mapping-table-target-f1');
    expect(within(f1Target).getByText('Not mapped')).toBeTruthy();
  });

  it('opens the target editor, cancels without raising approval, then saves and raises the exact ApprovalContext', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-actions-f1-edit'));
    expect(screen.getByTestId('mapping-table-target-f1-save')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-table-target-f1-cancel'));
    expect(screen.queryByTestId('mapping-table-target-f1-save')).toBeNull();
    expect(useWizardStore.getState().pendingApproval).toBeNull();

    fireEvent.press(screen.getByTestId('mapping-table-actions-f1-edit'));
    fireEvent.press(screen.getByTestId('mapping-table-target-f1-trigger'));
    fireEvent.press(screen.getByTestId('mapping-table-target-f1-option-default_code'));
    fireEvent.press(screen.getByTestId('mapping-table-target-f1-save'));

    // Raises approval — does NOT write directly: no decision recorded yet.
    expect(useWizardStore.getState().pendingApproval).toEqual({
      entityId: 'items',
      fieldId: 'f1',
      reason: 'user-override',
      proposedTargetId: 'default_code',
      previousTargetId: null,
    });
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
    // Editor closes on save.
    expect(screen.queryByTestId('mapping-table-target-f1-save')).toBeNull();

    // DA-378: confirming the modal is the one point where this override
    // becomes a real, overridden FieldDecision.
    expect(screen.getByText('Confirm manual target')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mapping-table-approval-apply'));

    expect(useWizardStore.getState().pendingApproval).toBeNull();
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
      expect.objectContaining({ fieldId: 'f1', status: 'overridden', targetId: 'default_code' }),
    ]);
  });

  it('shows "Set manually" only once a confirmed overridden decision exists for that row', async () => {
    const mapping = await loadMapping('items');

    act(() => {
      useWizardStore.getState().raiseApproval({
        entityId: 'items',
        fieldId: 'f2',
        reason: 'user-override',
        proposedTargetId: 'default_code',
        previousTargetId: null,
      });
      useWizardStore.getState().confirmApproval();
    });
    renderTable(mapping, 'items');

    expect(within(screen.getByTestId('mapping-table-target-f2')).getByText('Set manually')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-target-f1')).queryByText('Set manually')).toBeNull();
  });

  it('renders Evidence, Confidence, Validation and Status for a fully-scored row (f3)', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping);

    expect(within(screen.getByTestId('mapping-table-evidence-f3')).getByText('Name')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-confidence-f3')).getByText('96%')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-validation-f3')).getByText('Compatible')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-status-f3')).getByText('Suggested')).toBeTruthy();
  });

  it('shows "—" for confidence/validation on a row with neither, and the real status', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping);

    expect(within(screen.getByTestId('mapping-table-confidence-f1')).getByText('—')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-validation-f1')).getByText('—')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-status-f1')).getByText('Excluded')).toBeTruthy();
  });

  it('accept raises approval with the AI-proposal ApprovalContext, without writing a decision until the modal confirms it', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-accept'));

    expect(useWizardStore.getState().pendingApproval).toEqual({
      entityId: 'items',
      fieldId: 'f3',
      reason: 'ai-proposal',
      proposedTargetId: 'default_code',
      previousTargetId: null,
      confidence: 96,
    });
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
    // Still just a plain button — nothing recorded yet.
    expect(screen.queryByTestId('mapping-table-actions-f3-accepted')).toBeNull();

    // DA-378: the modal shows AI-proposal copy and confirming it is the
    // one point where this becomes a real FieldDecision.
    expect(screen.getByText('Confirm AI-proposed mapping')).toBeTruthy();
    expect(screen.getByText('Accept this proposal (96% confidence). Nothing is written until you confirm.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-table-approval-apply'));

    expect(useWizardStore.getState().pendingApproval).toBeNull();
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
      expect.objectContaining({ fieldId: 'f3', status: 'accepted', targetId: 'default_code' }),
    ]);
    expect(screen.getByTestId('mapping-table-actions-f3-accepted')).toBeTruthy();
  });

  it('cancelling the approval modal closes it without recording anything', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-accept'));
    expect(screen.getByTestId('mapping-table-approval-cancel')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-table-approval-cancel'));

    expect(useWizardStore.getState().pendingApproval).toBeNull();
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
    expect(screen.queryByTestId('mapping-table-approval-cancel')).toBeNull();
  });

  it('shows the same "Preview changes" and "Review individually" buttons as Profile\'s dialog, reused from the shared ApprovalModal', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-accept'));

    // Hidden until toggled.
    expect(screen.queryByText(/AI-suggested mapping \(96% confidence\)/)).toBeNull();

    fireEvent.press(screen.getByTestId('mapping-table-approval-preview'));
    expect(
      screen.getByText(
        'Before — AI-suggested mapping (96% confidence), not yet applied.   After — mapping confirmed and used for the migration.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-table-approval-preview'));
    expect(screen.queryByText(/AI-suggested mapping \(96% confidence\)/)).toBeNull();

    // "Review individually" closes without recording anything — same stub
    // behaviour as Profile's own onReviewIndividually (a toast, no real
    // row-by-row flow).
    expect(screen.getByTestId('mapping-table-approval-review')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mapping-table-approval-review'));

    expect(useWizardStore.getState().pendingApproval).toBeNull();
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
  });

  it('exclude raises approval (now gated behind the same modal as Accept/Retarget), and confirming it writes the decision and swaps to the Excluded badge', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-exclude'));

    // Raises approval — does NOT write directly, reversing the earlier
    // direct-write design per DA-353's own text.
    expect(useWizardStore.getState().pendingApproval).toEqual({
      entityId: 'items',
      fieldId: 'f3',
      reason: 'exclude',
      proposedTargetId: null,
      previousTargetId: null,
    });
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
    expect(screen.getByText('Confirm exclude field')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-table-approval-apply'));

    expect(useWizardStore.getState().pendingApproval).toBeNull();
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
      expect.objectContaining({ fieldId: 'f3', status: 'excluded' }),
    ]);
    expect(screen.getByTestId('mapping-table-actions-f3-excluded')).toBeTruthy();
    expect(screen.queryByTestId('mapping-table-actions-f3-exclude')).toBeNull();
  });

  it('bookmark toggles local UI state only, without touching wizard.store', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-bookmark'));
    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-bookmark'));

    expect(useWizardStore.getState().pendingApproval).toBeNull();
    expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
  });

  it('clicking a row opens the drawer showing that row', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    expect(screen.queryByTestId('mapping-table-drawer-close')).toBeNull();

    fireEvent.press(screen.getByTestId('mapping-table-row-f4'));

    expect(screen.getByTestId('mapping-table-drawer-close')).toBeTruthy();
    expect(within(screen.getByTestId('mapping-table-drawer-title')).getByText('Display Name')).toBeTruthy();
    expect(useMappingScreenStore.getState().openFieldId).toBe('f4');
  });

  it('close button closes the drawer', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-row-f4'));
    expect(screen.getByTestId('mapping-table-drawer-close')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mapping-table-drawer-close'));
    expect(screen.queryByTestId('mapping-table-drawer-close')).toBeNull();
    expect(useMappingScreenStore.getState().openFieldId).toBeNull();
  });

  // RNTL's fireEvent.press invokes only the pressed element's own handler —
  // it doesn't simulate real DOM click bubbling, so it can't exercise the
  // stopPropagation guard itself (same limitation already applies to
  // Sheet.tsx's own backdrop/panel click guard, which this mirrors). What
  // this DOES verify: none of these cells' own handlers call openField, and
  // openFieldId stays untouched by pressing them.
  it('pressing the checkbox, the target-edit trigger, or an action icon does not open the drawer', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    fireEvent.press(screen.getByTestId('mapping-table-select-f3'));
    expect(useMappingScreenStore.getState().openFieldId).toBeNull();

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-edit'));
    expect(useMappingScreenStore.getState().openFieldId).toBeNull();

    fireEvent.press(screen.getByTestId('mapping-table-actions-f3-bookmark'));
    expect(useMappingScreenStore.getState().openFieldId).toBeNull();

    expect(screen.queryByTestId('mapping-table-drawer-close')).toBeNull();
  });

  it('prev/next navigate the full filtered+sorted set (not just the current page), wrapping around', async () => {
    const mapping = await loadMapping('items');
    act(() => {
      useMappingScreenStore.getState().pickCardFilter('high');
    });
    renderTable(mapping, 'items');

    // Card filter narrows to f3/f4/f7, unsorted (fixture order): f3, f4, f7.
    fireEvent.press(screen.getByTestId('mapping-table-row-f3'));
    expect(useMappingScreenStore.getState().openFieldId).toBe('f3');

    fireEvent.press(screen.getByTestId('mapping-table-drawer-next'));
    expect(useMappingScreenStore.getState().openFieldId).toBe('f4');

    fireEvent.press(screen.getByTestId('mapping-table-drawer-next'));
    expect(useMappingScreenStore.getState().openFieldId).toBe('f7');

    // Wraps back to the first.
    fireEvent.press(screen.getByTestId('mapping-table-drawer-next'));
    expect(useMappingScreenStore.getState().openFieldId).toBe('f3');

    // Prev from the first wraps to the last.
    fireEvent.press(screen.getByTestId('mapping-table-drawer-prev'));
    expect(useMappingScreenStore.getState().openFieldId).toBe('f7');
  });

  it('grows Sample values to fill leftover width on a wide screen, and falls back to its base width on a narrow one', async () => {
    const mapping = await loadMapping('items');
    renderTable(mapping, 'items');

    // Before any layout event, falls back to the 190px base.
    expect(cellWidth('mapping-table-sample-f1')).toBe(190);

    // Every other column's fixed width sums to 1222 — well below 1622, so
    // Sample values grows to absorb the leftover 400px.
    fireEvent(screen.getByTestId('mapping-table'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 1622, height: 900 } },
    });
    expect(cellWidth('mapping-table-sample-f1')).toBe(400);
    expect(cellWidth('mapping-table-header-sample')).toBe(400);

    // At/below the fixed-columns sum, stays at its 190px base (today's
    // behaviour) and the table's own horizontal scroll takes over instead.
    fireEvent(screen.getByTestId('mapping-table'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 1000, height: 900 } },
    });
    expect(cellWidth('mapping-table-sample-f1')).toBe(190);
  });

  it('sorts by Confidence, unscored rows lowest', async () => {
    const mapping = await loadMapping('items');
    act(() => {
      useMappingScreenStore.getState().pickCardFilter('high');
    });
    renderTable(mapping);

    // Real confidence values: f3=96, f4=98, f7=97.
    fireEvent.press(screen.getByTestId('mapping-table-sort-conf'));
    expect(rowIds()).toEqual(['f3', 'f7', 'f4']); // ascending

    fireEvent.press(screen.getByTestId('mapping-table-sort-conf'));
    expect(rowIds()).toEqual(['f4', 'f7', 'f3']); // descending
  });

  describe('bulk accept (DA-384)', () => {
    // "Accept N high-confidence" moved to FieldMappingScreen.tsx's header
    // (mapping.page.html's reference pageHeader has one bulkApprove
    // button next to Back/Continue, not a separate in-table banner) —
    // covered in FieldMappingScreen.test.tsx now. This table only owns the
    // arbitrary-selection "Accept selected" path below.
    it('"Accept selected" only includes eligible rows from the current selection, ignoring the rest', async () => {
      const mapping = await loadMapping('items');
      renderTable(mapping, 'items');

      // f1 is Excluded (ineligible: canBulkAccept is false); f4 is Suggested with a real target (eligible).
      fireEvent.press(screen.getByTestId('mapping-table-select-f1'));
      fireEvent.press(screen.getByTestId('mapping-table-select-f4'));

      const toolbar = screen.getByTestId('mapping-table-bulk-toolbar');
      expect(within(toolbar).getByText('2 fields selected')).toBeTruthy();

      fireEvent.press(screen.getByTestId('mapping-table-bulk-toolbar-accept'));

      const pending = useWizardStore.getState().pendingApproval;
      expect(pending?.reason).toBe('bulk-accept');
      expect(pending?.bulkFields).toEqual([
        expect.objectContaining({ fieldId: 'f4', targetFieldId: 'name' }),
      ]);

      fireEvent.press(screen.getByTestId('mapping-table-approval-apply'));

      expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')]).toEqual([
        expect.objectContaining({ fieldId: 'f4', status: 'accepted', targetId: 'name' }),
      ]);
      // DA-384 DoD: toolbar clears the selection once the bulk accept is applied.
      expect(useMappingScreenStore.getState().selected).toEqual({});
      expect(screen.queryByTestId('mapping-table-bulk-toolbar')).toBeNull();
    });

    it('selecting only ineligible rows raises nothing and leaves the selection untouched', async () => {
      const mapping = await loadMapping('items');
      renderTable(mapping, 'items');

      fireEvent.press(screen.getByTestId('mapping-table-select-f1')); // Excluded — ineligible
      fireEvent.press(screen.getByTestId('mapping-table-bulk-toolbar-accept'));

      expect(useWizardStore.getState().pendingApproval).toBeNull();
      expect(useMappingScreenStore.getState().selected).toEqual({ f1: true });
    });

    it('Clear on the bulk toolbar clears the selection directly, without opening the approval modal', async () => {
      const mapping = await loadMapping('items');
      renderTable(mapping, 'items');

      fireEvent.press(screen.getByTestId('mapping-table-select-f3'));
      expect(screen.getByTestId('mapping-table-bulk-toolbar')).toBeTruthy();

      fireEvent.press(screen.getByTestId('mapping-table-bulk-toolbar-clear'));

      expect(useMappingScreenStore.getState().selected).toEqual({});
      expect(useWizardStore.getState().pendingApproval).toBeNull();
      expect(screen.queryByTestId('mapping-table-bulk-toolbar')).toBeNull();
    });

    it('cancelling the bulk-accept approval modal also clears the selection, and writes nothing', async () => {
      const mapping = await loadMapping('items');
      renderTable(mapping, 'items');

      fireEvent.press(screen.getByTestId('mapping-table-select-f3'));
      fireEvent.press(screen.getByTestId('mapping-table-bulk-toolbar-accept'));
      expect(screen.getByTestId('mapping-table-approval-cancel')).toBeTruthy();

      fireEvent.press(screen.getByTestId('mapping-table-approval-cancel'));

      expect(useWizardStore.getState().pendingApproval).toBeNull();
      expect(useWizardStore.getState().decisionsByEntity[buildEntityKey('', 'items')] ?? []).toEqual([]);
      expect(useMappingScreenStore.getState().selected).toEqual({});
    });

    it('does not render the bulk toolbar when nothing is selected', () => {
      const mapping: EntityMapping = {
        proposals: [{ id: 'p1', name: 'Only Row', status: 'Excluded' }],
        cards: [],
      };
      renderTable(mapping, 'items');

      expect(screen.queryByTestId('mapping-table-bulk-toolbar')).toBeNull();
    });
  });
});
