import React, { useCallback, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useAppStore } from '@/shared/store/app.store';
import { useToast } from '@/shared/hooks/useToast';
import { Table } from '@/shared/components/ui/Table';
import { TablePagination } from '@/shared/components/ui/TablePagination';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useMappingScreenStore } from '@/features/master-data-wizard/store/mappingScreen.store';
import { buildEntityKey, useWizardStore } from '@/features/master-data-wizard/store/wizard.store';
import { useBookmarks } from '@/features/master-data-wizard/hooks/useBookmarks';
import { useFieldNav } from '@/features/master-data-wizard/hooks/useFieldNav';
import { useApproval } from '@/features/master-data-wizard/hooks/useApproval';
import { MappingFieldDrawer } from '@/shared/components/ui/MappingFieldDrawer/MappingFieldDrawer';
import { ApprovalModal } from '@/shared/components/ui/ApprovalModal/ApprovalModal';
import { MappingBulkToolbar } from '@/shared/components/ui/MappingBulkToolbar/MappingBulkToolbar';
import type { SelectOption } from '@/shared/components/ui/Select';
import {
  buildMappingRows,
  mappingSortValue,
  canBulkAccept,
  toBulkAcceptField,
  type MappingRow,
} from '@/features/master-data-wizard/utils/mappingRows';
import { MappingTableHeader } from './MappingTableHeader';
import {
  MappingTableRow,
  CHECKBOX_WIDTH,
  ROW_NO_WIDTH,
  SOURCE_WIDTH,
  SAMPLE_WIDTH,
  ROLE_WIDTH,
  TARGET_WIDTH,
  EVIDENCE_WIDTH,
  CONFIDENCE_WIDTH,
  VALIDATION_WIDTH,
  STATUS_WIDTH,
  ACTIONS_WIDTH,
} from './MappingTableRow';
import type { EntityId, EntityMapping } from '@/features/master-data-wizard/dp-kit/types/entity';

const EMPTY_BOOKMARKED_IDS: ReadonlySet<string> = new Set();

interface MappingTableProps {
  readonly entityId: EntityId;
  readonly mapping: EntityMapping | undefined;
  /** Seed for `useBookmarks` — from `useMappingData`'s `bookmarkedIds`
   *  (real GET response's `is_bookmarked`). Optional so existing
   *  fixture-driven call sites without a real backend load don't need to
   *  supply one — defaults to "nothing bookmarked yet". */
  readonly bookmarkedIds?: ReadonlySet<string>;
  readonly testID?: string;
}

/**
 * DA-373 (shell + columns 1-5: checkbox, #, Source field + sdtype,
 * Sample values, Inferred role) + DA-374 (column 6: Proposed target with
 * inline retarget editing). Reads all its own filter/sort/page/selection/
 * edit state from `mappingScreen.store.ts` — mirrors `FieldsTable`'s
 * documented convention exactly ("zero local table state for business
 * data... all state comes from the store"); `mapping`/`entityId` are the
 * only real props, since the store correctly doesn't own the raw pack
 * data or double as a route-param store.
 */
export function MappingTable({ entityId, mapping, bookmarkedIds, testID }: MappingTableProps): React.JSX.Element {
  // Forces re-render on theme toggle so colors.* below reads fresh values.
  useAppStore((s) => s.theme);
  const cardFilter = useMappingScreenStore((s) => s.cardFilter);
  const sortKey = useMappingScreenStore((s) => s.sortKey);
  const sortDir = useMappingScreenStore((s) => s.sortDir);
  const page = useMappingScreenStore((s) => s.page);
  const pageSize = useMappingScreenStore((s) => s.pageSize);
  const setPageSize = useMappingScreenStore((s) => s.setPageSize);
  const selected = useMappingScreenStore((s) => s.selected);
  const editingRowId = useMappingScreenStore((s) => s.editingRowId);
  const draftTargetId = useMappingScreenStore((s) => s.draftTargetId);
  const toggleSort = useMappingScreenStore((s) => s.toggleSort);
  const setPage = useMappingScreenStore((s) => s.setPage);
  const toggleRowSelect = useMappingScreenStore((s) => s.toggleRowSelect);
  const toggleSelectAllOn = useMappingScreenStore((s) => s.toggleSelectAllOn);
  const clearSelection = useMappingScreenStore((s) => s.clearSelection);
  const clearCardFilter = useMappingScreenStore((s) => s.clearCardFilter);
  const startEditTarget = useMappingScreenStore((s) => s.startEditTarget);
  const setDraftTarget = useMappingScreenStore((s) => s.setDraftTarget);
  const cancelEditTarget = useMappingScreenStore((s) => s.cancelEditTarget);
  const openFieldId = useMappingScreenStore((s) => s.openFieldId);
  const openField = useMappingScreenStore((s) => s.openField);
  const closeField = useMappingScreenStore((s) => s.closeField);

  // Accept/Retarget/Exclude all raise approval, confirmed through the
  // ApprovalModal below — Exclude joins the other two behind the same
  // gate per DA-353's own text (reverses DA-376/378's earlier direct-write
  // choice for Exclude).
  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  const decisions = useWizardStore((s) => s.decisionsByEntity[buildEntityKey(parentProjectId ?? '', entityId)]);
  const raiseApproval = useWizardStore((s) => s.raiseApproval);
  const { pendingApproval, isOpen: isApprovalOpen, copy: approvalCopy, confirm: confirmApproval, cancel: cancelApproval } = useApproval();
  const { overriddenFieldIds, acceptedFieldIds, excludedFieldIds } = useMemo(() => {
    const byStatus = { overriddenFieldIds: new Set<string>(), acceptedFieldIds: new Set<string>(), excludedFieldIds: new Set<string>() };
    for (const d of decisions ?? []) {
      if (d.status === 'overridden') byStatus.overriddenFieldIds.add(d.fieldId);
      else if (d.status === 'accepted') byStatus.acceptedFieldIds.add(d.fieldId);
      else if (d.status === 'excluded') byStatus.excludedFieldIds.add(d.fieldId);
    }
    return byStatus;
  }, [decisions]);
  const { isBookmarked, toggleBookmark } = useBookmarks(entityId, bookmarkedIds ?? EMPTY_BOOKMARKED_IDS);
  const { showSuccess } = useToast();

  // The card stretches to fill whatever width its parent gives it (default
  // cross-axis stretch — no `self-start` override), same as a real HTML
  // <table width="100%">. onLayout reports that stretched width, which is
  // fixed by the parent regardless of the table's own content, so reading
  // it here to size a column can't create a layout feedback loop — same
  // technique and same reasoning as `FieldsTable.tsx`'s own `colWidths`.
  // The leftover after every other fixed-width column goes to Sample
  // values, the one column the reference itself gives a `min-width`
  // instead of a fixed width. Below that sum, it drops back to its own
  // base width and the table's horizontal ScrollView scrolls instead,
  // exactly as before this change.
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);
  const sampleWidth = useMemo(() => {
    if (containerWidth === null) return SAMPLE_WIDTH;
    const fixedSum =
      CHECKBOX_WIDTH + ROW_NO_WIDTH + SOURCE_WIDTH + ROLE_WIDTH + TARGET_WIDTH +
      EVIDENCE_WIDTH + CONFIDENCE_WIDTH + VALIDATION_WIDTH + STATUS_WIDTH + ACTIONS_WIDTH;
    return Math.max(SAMPLE_WIDTH, containerWidth - fixedSum);
  }, [containerWidth]);

  const targetOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Not mapped' },
      ...(mapping?.targetFields ?? []).map((t) => ({
        value: t.id,
        label: t.label + (t.dtype ? ' · ' + t.dtype : '') + (t.writable === false ? ' · read-only' : ''),
      })),
    ],
    [mapping],
  );

  const { paged, pageCount, total, sorted } = useMemo(() => {
    const filtered = buildMappingRows(mapping, cardFilter);
    const sortedRows = sortKey
      ? [...filtered].sort((a, b) => {
          const av = mappingSortValue(a, sortKey);
          const bv = mappingSortValue(b, sortKey);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDir === 'asc' ? cmp : -cmp;
        })
      : filtered;

    const count = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const clampedPage = Math.min(page, count - 1);
    const rows = sortedRows
      .slice(clampedPage * pageSize, (clampedPage + 1) * pageSize)
      .map((row, i) => ({ row, rowNo: clampedPage * pageSize + i + 1 }));

    return { paged: rows, pageCount: count, total: sortedRows.length, sorted: sortedRows };
  }, [mapping, cardFilter, sortKey, sortDir, page, pageSize]);

  const startRow = paged.length > 0 ? page * pageSize + 1 : 0;
  const endRow = paged.length > 0 ? page * pageSize + paged.length : 0;
  const pageIds = paged.map(({ row }) => row.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);

  // Drawer nav covers the full filtered+sorted set, not just the page.
  const { onPrev, onNext } = useFieldNav(sorted, openFieldId, openField);
  const openRow = sorted.find((r) => r.id === openFieldId) ?? null;

  const handleSaveTarget = (row: MappingRow): void => {
    raiseApproval({
      entityId,
      fieldId: row.id,
      reason: 'user-override',
      proposedTargetId: draftTargetId || null,
      previousTargetId: row.targetId ?? null,
    });
    cancelEditTarget();
  };

  const handleAccept = (row: MappingRow): void => {
    raiseApproval({
      entityId,
      fieldId: row.id,
      reason: 'ai-proposal',
      proposedTargetId: row.targetId ?? null,
      previousTargetId: null,
      confidence: row.conf,
    });
  };

  const handleExclude = (row: MappingRow): void => {
    raiseApproval({
      entityId,
      fieldId: row.id,
      reason: 'exclude',
      proposedTargetId: null,
      previousTargetId: null,
    });
  };

  const selectedCount = Object.keys(selected).length;

  // DA-384: raises the same approval gate as every other write.
  // canBulkAccept re-filters (rather than trusting the caller's own set)
  // since a row can change status out from under a selection between
  // render and press. The "accept every high-confidence row" path lives
  // in FieldMappingScreen.tsx now (header button, per the reference — this
  // table only owns the arbitrary-selection path).
  const raiseBulkAccept = (rows: readonly MappingRow[]): void => {
    const bulkFields = rows.filter(canBulkAccept).map(toBulkAcceptField);
    if (bulkFields.length === 0) return;
    raiseApproval({
      entityId,
      fieldId: '',
      reason: 'bulk-accept',
      proposedTargetId: null,
      previousTargetId: null,
      bulkFields,
    });
  };

  const handleAcceptSelected = (): void => {
    raiseBulkAccept(sorted.filter((row) => selected[row.id]));
  };

  // DA-384's own DoD: "toolbar clears selection after apply/cancel" — only
  // for the bulk-accept path (checked before confirm/cancel resets
  // pendingApproval to null); a single-field approval never touches
  // selection at all.
  const handleApprovalConfirm = (): void => {
    const wasBulkAccept = pendingApproval?.reason === 'bulk-accept';
    confirmApproval();
    if (wasBulkAccept) clearSelection();
  };

  const handleApprovalClose = (): void => {
    const wasBulkAccept = pendingApproval?.reason === 'bulk-accept';
    cancelApproval();
    if (wasBulkAccept) clearSelection();
  };

  if (total === 0) {
    return (
      <View testID={testID} className="overflow-hidden rounded-xl border border-border bg-card">
        <EmptyState
          title="No fields match this filter"
          description="Clear the active filter to see every field again."
          action={{ label: 'Clear filter', onPress: clearCardFilter }}
          testID={testID !== undefined ? `${testID}-empty` : undefined}
        />
      </View>
    );
  }

  return (
    <View testID={testID} className="overflow-hidden rounded-xl border border-border bg-card" onLayout={handleLayout}>
      <View className="p-2.5 pb-0">
        <MappingBulkToolbar
          selectedCount={selectedCount}
          onClear={clearSelection}
          onAcceptSelected={handleAcceptSelected}
          testID={testID !== undefined ? `${testID}-bulk-toolbar` : undefined}
        />
      </View>

      <Table horizontal bordered={false} maxHeight={900}>
        <MappingTableHeader
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          allSelected={allSelected}
          onToggleSelectAll={() => toggleSelectAllOn(pageIds)}
          sampleWidth={sampleWidth}
          testID={testID}
        />

        {paged.map(({ row, rowNo }) => (
          <MappingTableRow
            key={row.id}
            row={row}
            rowNo={rowNo}
            sampleWidth={sampleWidth}
            selected={!!selected[row.id]}
            onToggleSelect={() => toggleRowSelect(row.id)}
            targetOptions={targetOptions}
            isOverridden={overriddenFieldIds.has(row.id)}
            isEditingTarget={editingRowId === row.id}
            draftTargetId={draftTargetId}
            onStartEditTarget={() => startEditTarget(row.id, row.targetId ?? '')}
            onDraftTargetChange={setDraftTarget}
            onSaveTarget={() => handleSaveTarget(row)}
            onCancelEditTarget={cancelEditTarget}
            isAccepted={acceptedFieldIds.has(row.id)}
            isExcluded={excludedFieldIds.has(row.id)}
            isBookmarked={isBookmarked(row.id)}
            onAccept={() => handleAccept(row)}
            onExclude={() => handleExclude(row)}
            onToggleBookmark={() => toggleBookmark(row.id)}
            onOpen={() => openField(row.id)}
            testID={testID}
          />
        ))}
      </Table>

      <TablePagination
        page={page}
        pageCount={pageCount}
        startRow={startRow}
        endRow={endRow}
        total={total}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        testID={testID}
      />

      <MappingFieldDrawer
        row={openRow}
        onClose={closeField}
        onPrev={onPrev}
        onNext={onNext}
        isAccepted={openRow !== null && acceptedFieldIds.has(openRow.id)}
        isExcluded={openRow !== null && excludedFieldIds.has(openRow.id)}
        onAccept={() => openRow && handleAccept(openRow)}
        onExclude={() => openRow && handleExclude(openRow)}
        testID={testID !== undefined ? `${testID}-drawer` : undefined}
      />

      <ApprovalModal
        visible={isApprovalOpen}
        copy={approvalCopy}
        onConfirm={handleApprovalConfirm}
        onClose={handleApprovalClose}
        onReviewIndividually={() => showSuccess('Opening row-by-row review…')}
        testID={testID !== undefined ? `${testID}-approval` : undefined}
      />
    </View>
  );
}
