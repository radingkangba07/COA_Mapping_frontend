import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { isWeb } from '@/shared/utils/platform.utils';
import { Table } from '@/shared/components/ui/Table';
import { Button } from '@/shared/components/ui/Button';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { TablePagination } from '@/shared/components/ui/TablePagination';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { SemanticBadge } from '../SemanticBadge/SemanticBadge';
import { GradientChip } from '@/shared/components/ui/GradientChip';
import { RowActionsCell } from './RowActionsCell';
import { useSourceProfileStore, type SortKey } from '@/features/master-data-wizard/store/sourceProfile.store';
import { decisionStateFor } from '@/features/master-data-wizard/utils/decisions';
import { tint, mixHex } from '@/features/master-data-wizard/utils/colorMix';
import { matchesCategory, fmt, pctOf, uniquenessPct, confidencePct, humanizeLabel, sortValueFor } from '@/features/master-data-wizard/utils/fields';
import { UnsortedIcon } from '@/shared/components/icons/UnsortedIcon';
import { confidenceRamp, nullRowsRamp } from '@/features/master-data-wizard/utils/metricRamp';
import { impactLabel } from '@/features/master-data-wizard/utils/taxonomy';
import type { EntityPack } from '@/features/master-data-wizard/dp-kit/types/entity';

interface FieldsTableProps {
  readonly pack: EntityPack;
  // The KPI strip's active metric's own `highlight` field-id list — rows
  // in it get an accent-tinted background. Empty when no metric filter is
  // active (no row highlighted).
  readonly highlightIds: readonly string[];
  // Drives dimming (opacity 0.34 on every row NOT in this list) — separate
  // from `highlightIds` because the reference's own `filterIds` only gets
  // set alongside `highlightIds` for a metric click or the "idprob"
  // Copilot prompt; every other prompt highlights rows without dimming the
  // rest. Empty means nothing dims.
  readonly dimIds: readonly string[];
  // The KPI strip's active metric's own `highlight` field-id list, narrowing
  // which rows render at all — unlike `highlightIds`/`dimIds`, which only
  // change row styling. `null`/omitted (no metric active, or the active
  // metric's tile has no `highlight`, e.g. "Total records") means every row
  // (post category-filter) renders, same as before this prop existed.
  readonly filterIds?: readonly string[] | null;
  readonly testID?: string;
}

interface HeaderDef {
  readonly label: string;
  readonly sortKey: SortKey;
  readonly col: keyof typeof COL;
  /** Reference's own `SORT_DEFS[].tip` — a native `title=` tooltip on every column header, explaining what it shows. */
  readonly tip: string;
}

// Reference headers are normal-case, font-weight 500, centered — not the
// uppercase/semibold look this table had before. Colour is applied inline
// (see `headerRestColor` in the component body) rather than via a
// `text-muted-foreground` class here, since the reference's own literal
// `color:var(--muted)` reads too light against this app's actual muted
// value at typical zoom — darkened a step, still derived from theme
// tokens (never a hardcoded hex), per explicit user request.
const HEADER_TEXT_CLASS = 'text-center uppercase font-body text-xs font-medium';

const CHECKBOX_WIDTH = 30;

// Upper bound on rows shown per page — a local UI constant, not sourced
// from dp-taxonomies.json (the taxonomy models field-level vocabulary, not
// this table's own pagination). The actual per-render page size (below) is
// calculated from the table's own current field count, capped at this
// max: a pack with fewer fields than this never shows an unused amount of
// empty page room or a pagination footer it doesn't need.
const MAX_PAGE_SIZE = 15;

const CONFIDENCE_TOOLTIP = 'Confidence in the inferred role/datatype — not overall data quality.';

// 34px (the reference's own fixed value) only fits up to 2-digit row
// numbers — verified against this fixture's 33-field max. Scales up for
// larger packs instead of silently wrapping to two lines again past 99.
const ROW_NO_BASE_WIDTH = 34;
const ROW_NO_DIGIT_STEP = 8;

function rowNoWidthFor(maxRowNo: number): number {
  const digits = String(Math.max(1, maxRowNo)).length;
  return ROW_NO_BASE_WIDTH + Math.max(0, digits - 2) * ROW_NO_DIGIT_STEP;
}

// The reference freezes its first three columns (checkbox, #, Field) via
// `position:sticky` + a cumulative `left` offset per column (confirmed
// against the decoded reference template's own CSS rules). RN has no
// built-in equivalent, but react-native-web passes `position:'sticky'`
// straight through to real CSS — same technique Table.tsx's own sticky
// header already relies on — so this only takes effect on web; native
// (iOS/Android) falls back to scrolling normally with the rest of the row.
function stickyLeft(left: number): StyleProp<ViewStyle> {
  if (!isWeb) return undefined;
  return { position: 'sticky' as unknown as 'relative', left, zIndex: 2 };
}

// The reference makes the whole row clickable (`tr[data-clickable="true"]
// onClick`) — the checkbox and actions cells sit inside that same row, so
// a tap on either must not also open the field profile. On web, Pressable
// renders a real DOM node whose click bubbles to the row's own Pressable
// unless stopped; RN's native touch-responder system has no such bubbling,
// so this is a no-op there. `GestureResponderEvent`'s RN type doesn't
// declare `stopPropagation` (it models native touches only), but
// react-native-web's actual runtime event object has one — asserting
// through `unknown` bridges that gap; there's no type-safe narrowing path
// since the RN type carries no discriminant for "is this the web event".
function stopRowPress(e: GestureResponderEvent): void {
  (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
}

// Fixed per-column widths, one uniform 140px for every content column.
//
// An earlier revision tried to auto-size these from each cell's actual
// measured content (useAutoColumnWidth, since removed) — that measurement
// lived inside the very Table.Cell View whose width it was trying to
// determine, so onLayout could never report more than the column's current
// (already-fixed) width: Yoga clamps an alignSelf:'center' child's auto
// width to `min(intrinsic content width, available cross-axis space)`, and
// available space *is* the parent's current width. It only ever "worked"
// for a single unwrappable token wider than the column — every real
// multi-word value just wrapped inside the existing width and reported
// that, so every one of these columns sat pinned at its 140px floor
// (itself raised from the reference's own narrower 112/118/130/132/96
// min-widths, needed so headers like "Migration impact" don't wrap
// awkwardly). That 140px floor is what has actually been rendering — this
// is those same numbers made literal now that nothing grows them further.
// `findings` was never part of the broken mechanism — it sizes itself from
// leftover container width instead (see colWidths below).
const COL = {
  field: 140,
  sample: 140,
  role: 140,
  type: 140,
  nullCount: 140,
  populated: 160,
  distinct: 140,
  findings: 260,
  confidence: 140,
  impact: 140,
} as const;

// Trailing edit/open/kebab-menu icon column — kept as its own named
// constant since it feeds into the fixed-width sum used to size the
// flexible "Profiling findings" column below. Sized for 3 icon buttons:
// 28px × 3 + 2px gap × 2 + 8px `px-2` padding × 2 = 104.
const ACTIONS_WIDTH = 104;

// The reference embeds a literal line break in these three labels only
// (`white-space:pre` + `"Count of\nNull Rows"` etc. in SORT_DEFS) — every
// other header is a single line that just needs enough column width, not
// automatic wrapping.
const HEADERS: readonly HeaderDef[] = [
  { label: 'Field', sortKey: 'name', col: 'field', tip: 'Source field name' },
  { label: 'Sample', sortKey: 'sample', col: 'sample', tip: 'Inferred meaning and example values' },
  { label: 'Inferred role', sortKey: 'role', col: 'role', tip: 'System-inferred semantic role' },
  { label: 'Type', sortKey: 'datatype', col: 'type', tip: 'Inferred datatype' },
  { label: 'Count of\nNull Rows', sortKey: 'nullCount', col: 'nullCount', tip: 'Null count and percentage' },
  { label: 'Count of\nPopulated Rows', sortKey: 'populated', col: 'populated', tip: 'Populated row count and percentage' },
  { label: 'Count of\nDistinct Rows', sortKey: 'distinct', col: 'distinct', tip: 'Distinct-value count and uniqueness percentage' },
  { label: 'Profiling findings', sortKey: 'findings', col: 'findings', tip: 'Deterministic issues found for this field' },
  { label: 'Confidence', sortKey: 'confidence', col: 'confidence', tip: 'Confidence in the inferred role/datatype' },
  { label: 'Migration impact', sortKey: 'impact', col: 'impact', tip: 'Severity of this field for the migration' },
];

export const FieldsTable = ({ pack, highlightIds, dimIds, filterIds = null, testID }: FieldsTableProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  // A step darker than plain `mutedForeground` for header rest-state text
  // — see HEADER_TEXT_CLASS's comment above.
  const headerRestColor = mixHex(colors.mutedForeground, colors.foreground, 0.08);
  const categoryFilter = useSourceProfileStore((s) => s.categoryFilter);
  const sortKey = useSourceProfileStore((s) => s.sortKey);
  const sortDirection = useSourceProfileStore((s) => s.sortDirection);
  const page = useSourceProfileStore((s) => s.page);
  const selectedIds = useSourceProfileStore((s) => s.selectedIds);
  const decisions = useSourceProfileStore((s) => s.decisions);
  const setSort = useSourceProfileStore((s) => s.setSort);
  const setPage = useSourceProfileStore((s) => s.setPage);
  const toggleSelected = useSourceProfileStore((s) => s.toggleSelected);
  const openField = useSourceProfileStore((s) => s.openField);

  const rowCount = pack.source.rowCount ?? 0;

  const { paged, pageCount, total, pageSize } = useMemo(() => {
    const filtered = pack.fields.filter(
      (f) => matchesCategory(f, categoryFilter) && (filterIds === null || filterIds.includes(f.id)),
    );
    const sorted = sortKey
      ? [...filtered].sort((a, b) => {
        const av = sortValueFor(a, sortKey, rowCount);
        const bv = sortValueFor(b, sortKey, rowCount);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDirection === 'asc' ? cmp : -cmp;
      })
      : filtered;

    // Calculated from this table's own current field count, not a fixed
    // constant — a pack with fewer fields than MAX_PAGE_SIZE gets exactly
    // that many per page (so `total > pageSize` below never shows a
    // pagination footer it doesn't need); one with more is capped at
    // MAX_PAGE_SIZE per page, same as before.
    const effectivePageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, sorted.length));
    const count = Math.max(1, Math.ceil(sorted.length / effectivePageSize));
    const clampedPage = Math.min(page, count - 1);
    const rows = sorted
      .slice(clampedPage * effectivePageSize, (clampedPage + 1) * effectivePageSize)
      .map((f, i) => ({ field: f, rowNo: clampedPage * effectivePageSize + i + 1 }));

    return { paged: rows, pageCount: count, total: sorted.length, pageSize: effectivePageSize };
  }, [pack.fields, categoryFilter, filterIds, sortKey, sortDirection, page, rowCount]);

  const startRow = paged.length > 0 ? (page * pageSize) + 1 : 0;
  const endRow = paged.length > 0 ? (page * pageSize) + paged.length : 0;

  // Sized from the actual max row number (not a fixed guess) so packs with
  // 100+ or 1000+ fields don't wrap their "#" column the same way 2-digit
  // numbers did before this column had any padding tuning at all.
  const rowNoWidth = rowNoWidthFor(total);
  const frozenLeft = {
    checkbox: 0,
    rowNo: CHECKBOX_WIDTH,
    field: CHECKBOX_WIDTH + rowNoWidth,
  };

  // The card stretches to fill whatever width its parent gives it (default
  // cross-axis stretch — no `self-start` override), same as a real HTML
  // <table width="100%">. onLayout reports that stretched width, which is
  // fixed by the parent regardless of the table's own content, so reading
  // it here to size a column can't create a layout feedback loop. The
  // leftover after every fixed-width column (including the trailing
  // actions column) goes to "Profiling findings" — the one column whose
  // content (wrapping badges) tolerates extra room instead of looking
  // stretched-thin. Below the fixed-columns sum, findings drops back to
  // its own base width and the table's horizontal ScrollView scrolls
  // instead, exactly as before this change.
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // Web-only row hover (`tr[data-clickable="true"]:hover`) — one id for
  // the whole table rather than per-row state, since a row is a plain
  // object produced inside `.map()`, not its own component.
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Sort-header hover — same one-id-for-the-whole-table pattern as rows,
  // since each header button is also created inside a `.map()`.
  const [hoveredSortKey, setHoveredSortKey] = useState<SortKey>(null);

  const colWidths = useMemo(() => {
    if (containerWidth === null) return COL;
    const fixedSum =
      CHECKBOX_WIDTH + rowNoWidth + COL.field + COL.sample + COL.role + COL.type +
      COL.nullCount + COL.populated + COL.distinct + COL.confidence + COL.impact + ACTIONS_WIDTH;
    return { ...COL, findings: Math.max(COL.findings, containerWidth - fixedSum) };
  }, [containerWidth, rowNoWidth]);

  return (
    <View
      testID={testID}
      className="overflow-hidden rounded-xl border border-border bg-card"
      onLayout={handleLayout}
    >
      <Table horizontal bordered={false} maxHeight={1040}>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell
              width={CHECKBOX_WIDTH}
              className="items-center justify-center bg-surface px-1 py-[11px]"
              style={stickyLeft(frozenLeft.checkbox)}
            >
              <View />
            </Table.HeaderCell>
            <Table.HeaderCell
              width={rowNoWidth}
              className="items-center bg-surface px-1 py-5"
              style={stickyLeft(frozenLeft.rowNo)}
            >
              <Text className={`${HEADER_TEXT_CLASS}  justify-center`} style={{ color: headerRestColor }}>#</Text>
            </Table.HeaderCell>
            {HEADERS.map((h, index) => (
              <Table.HeaderCell
                key={h.label}
                width={colWidths[h.col]}
                className={index === 0 ? 'items-center justify-center bg-surface p-0 uppercase' : 'items-center justify-center p-0'}
                style={index === 0 ? stickyLeft(frozenLeft.field) : undefined}
              >
                {h.sortKey ? (
                  (() => {
                    const isActive = sortKey === h.sortKey;
                    const isHovered = hoveredSortKey === h.sortKey;
                    // Mirrors the reference's own three-state ladder
                    // (already used for the Copilot feedback buttons):
                    // active always wins accent, otherwise hover brightens
                    // to full foreground, otherwise the header sits muted.
                    const fg = isActive ? colors.accent : isHovered ? colors.foreground : colors.mutedForeground;
                    return (
                      <Tooltip content={h.tip} position="bottom" className="self-stretch">
                        <Pressable
                          onPress={() => setSort(h.sortKey)}
                          onHoverIn={() => setHoveredSortKey(h.sortKey)}
                          onHoverOut={() => setHoveredSortKey((current) => (current === h.sortKey ? null : current))}
                          className="h-full flex-row items-center justify-center gap-[5px] px-3 py-[11px]"
                          // Reference: `button[data-active="true"]{background:
                          // color-mix(in srgb, var(--accent) 12%, transparent)}`
                          // — distinct from `badgeTint`'s fixed 13%.
                          style={{ backgroundColor: isActive ? tint(colors.accent, 12) : 'transparent' }}
                        >
                          <Text
                            className={`${HEADER_TEXT_CLASS}`}
                            numberOfLines={2}
                            style={{ color: fg }}
                          >
                            {h.label}
                          </Text>
                          {isActive ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp size={12} color={fg} />
                            ) : (
                              <ChevronDown size={12} color={fg} />
                            )
                          ) : (
                            <UnsortedIcon size={12} color={fg} />
                          )}
                        </Pressable>
                      </Tooltip>
                    );
                  })()
                ) : (
                  <Text
                    className={`${HEADER_TEXT_CLASS} px-3 py-[11px]`}
                    style={{ color: headerRestColor }}
                    numberOfLines={2}
                  >
                    {h.label}
                  </Text>
                )}
              </Table.HeaderCell>
            ))}
            <Table.HeaderCell width={ACTIONS_WIDTH} className="items-center justify-center bg-surface px-1 py-[11px]"><Text style={{ color: headerRestColor }} className={`${HEADER_TEXT_CLASS}`}>Action</Text></Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        {paged.map(({ field, rowNo }) => {
          const isSelected = selectedIds.includes(field.id);
          const isHighlighted = highlightIds.length > 0 && highlightIds.includes(field.id);
          const isDimmed = dimIds.length > 0 && !dimIds.includes(field.id);
          const rowBg = isHighlighted ? mixHex(colors.card, colors.accent, 0.08) : colors.card;
          const decisionState = decisionStateFor(field.id, decisions);
          const isRowHovered = hoveredRowId === field.id;
          const displayBg = !isHighlighted && !isDimmed && isRowHovered ? colors.surfaceHighlight : rowBg;
          // Reference: `tr[data-sel="true"]{box-shadow:inset 3px 0 0 var(--primary);}`
          // — an inset shadow doesn't affect layout, so it's the only way to
          // add this stripe without shifting row content. Web-only (RN's
          // `boxShadow` style value is a react-native-web extension, not
          // part of the cross-platform ViewStyle type).
          const selectedStripe = isWeb && isSelected ? { boxShadow: `inset 3px 0 0 ${colors.primary}` } : undefined;

          return (
            <Pressable
              key={field.id}
              onPress={() => openField(field.id)}
              onHoverIn={() => setHoveredRowId(field.id)}
              onHoverOut={() => setHoveredRowId((current) => (current === field.id ? null : current))}
              className="flex-row border-b border-border focus:outline-none"
              style={[
                { backgroundColor: displayBg, opacity: isDimmed ? 0.34 : 1 },
                selectedStripe as StyleProp<ViewStyle>,
              ]}
              testID={testID !== undefined ? `${testID}-row-${field.id}` : undefined}
            >
              <Table.Cell
                width={CHECKBOX_WIDTH}
                className="items-center justify-start px-3 py-3"
                style={[stickyLeft(frozenLeft.checkbox), { backgroundColor: colors.card }]}
              >
                <Pressable onPress={stopRowPress} className="flex-row items-center ">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelected(field.id)}
                    size="sm"
                    // Reference's row checkbox is a native `<input
                    // type="checkbox">` with only `accent-color` applied —
                    // no custom focus ring. This app's shared Checkbox adds
                    // a deliberate focus ring by default (`focus:ring-2`),
                    // which reads as an unwanted outline around the solid
                    // blue fill once clicked; zeroing it here (scoped to
                    // this call site only) matches the reference without
                    // touching the shared component's default elsewhere.
                    className="focus:ring-0 focus:ring-offset-0"
                    accessibilityLabel="Add to comparison"
                    testID={testID !== undefined ? `${testID}-select-${field.id}` : undefined}
                  />
                </Pressable>
              </Table.Cell>
              <Table.Cell
                width={rowNoWidth}
                className="items-center justify-start px-3 py-3"
                style={[stickyLeft(frozenLeft.rowNo), { backgroundColor: colors.card }]}
              >
                <Text className="text-left text-xs text-muted-foreground">{rowNo}</Text>
              </Table.Cell>
              <Table.Cell
                width={colWidths.field}
                className="items-center justify-start px-3 py-3"
                style={[stickyLeft(frozenLeft.field), { backgroundColor: colors.card }]}
              >
                <View className="flex-row shrink-0 items-center justify-center self-center">
                  <Text className="text-center text-sm font-bold text-foreground">{humanizeLabel(field.name)}</Text>
                  {decisionState.confirmed ? (
                    <SemanticBadge family="impact" state="clean" size="tag">CONFIRMED</SemanticBadge>
                  ) : null}
                  {decisionState.ignored ? (
                    <View className="rounded-[4px] border px-[5px] py-px" style={{ borderColor: colors.border }}>
                      <Text className="text-xs font-semibold" style={{ color: colors.mutedForeground }}>
                        IGNORED
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.sample} className="items-center justify-start px-3 py-2.5">
                <View className="items-center shrink-0 self-center">
                  {field.semantic ? (
                    <Text className="text-left text-xs text-muted-foreground">{field.semantic}</Text>
                  ) : null}
                  <Text className="mt-[3px]  text-left font-mono text-xs text-muted-foreground">
                    {field.sample && field.sample.length > 0 ? field.sample.slice(0, 3).join('  ·  ') : '—'}
                  </Text>
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.role} className="items-center justify-start px-3 py-2.5">
                <View className="shrink-0 self-center">
                  {field.roleTip !== undefined && field.roleTip.length > 0 ? (
                    <Tooltip content={field.roleTip} position="bottom" onPress={() => openField(field.id)}>
                      <Text className="text-left justify-start text-xs text-foreground">{humanizeLabel(field.role)}</Text>
                    </Tooltip>
                  ) : (
                    <Text className="text-left text-xs text-foreground">{humanizeLabel(field.role)}</Text>
                  )}
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.type} className="items-center justify-start px-3 py-2.5">
                <View className="shrink-0 self-center">
                  <Text className="text-left font-mono text-xs text-muted-foreground">{field.datatype}</Text>
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.nullCount} className="items-center justify-start px-2 py-2.5">
                <View className="items-center shrink-0 self-center">
                  <GradientChip {...nullRowsRamp(field.nullCount ?? 0, rowCount)} className="self-center">
                    {fmt(field.nullCount ?? 0)}
                  </GradientChip>
                  <Text className="mt-1 text-left text-xs text-muted-foreground">
                    {pctOf(field.nullCount ?? 0, rowCount)}
                  </Text>
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.populated} className="items-center justify-start px-2 py-2.5">
                <View className="items-center shrink-0 self-center">
                  <Text className="text-left font-mono text-xs text-muted-foreground">
                    {fmt(rowCount - (field.nullCount ?? 0))}
                  </Text>
                  <Text className="mt-1 text-left text-xs text-muted-foreground">
                    {pctOf(rowCount - (field.nullCount ?? 0), rowCount)}
                  </Text>
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.distinct} className="items-center justify-start px-3 py-2.5">
                <View className="items-center shrink-0 self-center">
                  <Text className="text-left font-mono text-xs text-foreground">{fmt(field.distinct ?? 0)}</Text>
                  <Text className="mt-[3px] text-left text-xs text-muted-foreground">
                    {uniquenessPct(field.uniqueness)}
                  </Text>
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.findings} className="items-center justify-start px-3 py-2.5">
                <View
                  // Reference: `display:grid;grid-template-columns:
                  // repeat(2,max-content);justify-content:center;gap:5px`
                  // — a fixed 2-column grid, not a wrap-when-it-runs-out-
                  // of-room flex row. RN has no grid primitive at all, so
                  // this is web-only (`display:'grid'` is valid web CSS,
                  // not part of RN's own `ViewStyle` union); native falls
                  // back to the previous flex-wrap approximation. Left-
                  // justified (not centered) per the table's start-aligned
                  // data-value convention.
                  style={
                    isWeb
                      ? ({ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', justifyContent: 'start', gap: 5 } as unknown as ViewStyle)
                      : { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 5 }
                  }
                >
                  {field.cardinality ? (
                    <View className="rounded-md bg-surface px-1.5 py-0.5">
                      <Text className="text-xs font-medium text-muted-foreground">Cardinality: {field.cardinality}</Text>
                    </View>
                  ) : null}
                  {(field.findings ?? []).map((finding) => (
                    <SemanticBadge key={finding.t} family="find" state={finding.tone}>
                      {finding.t}
                    </SemanticBadge>
                  ))}
                  {(field.findings ?? []).length === 0 ? (
                    <View className="flex-row items-center gap-1">
                      <Check size={12} color={colors.success} strokeWidth={2.5} />
                      <Text className="text-xs" style={{ color: colors.success }}>No issues</Text>
                    </View>
                  ) : null}
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.confidence} className="items-center justify-start px-3 py-2.5">
                <View className="shrink-0 self-center">
                  <Tooltip content={CONFIDENCE_TOOLTIP} position="bottom" onPress={() => openField(field.id)}>
                    <GradientChip {...confidenceRamp(field.confidence)} size="confidence" className="self-center">
                      {confidencePct(field.confidence)}
                    </GradientChip>
                  </Tooltip>
                </View>
              </Table.Cell>
              <Table.Cell width={colWidths.impact} className="items-center justify-start px-3 py-2.5">
                <View className="shrink-0 self-center">
                  {field.impactReason !== undefined && field.impactReason.length > 0 && !decisionState.ignored ? (
                    <Tooltip content={field.impactReason} position="bottom" onPress={() => openField(field.id)}>
                      <SemanticBadge family="impact" state={field.impact} className="self-center">
                        {impactLabel(field.impact)}
                      </SemanticBadge>
                    </Tooltip>
                  ) : (
                    <SemanticBadge
                      family="impact"
                      state={decisionState.ignored ? 'na' : field.impact}
                      className="self-center"
                    >
                      {decisionState.ignored ? 'Ignored' : impactLabel(field.impact)}
                    </SemanticBadge>
                  )}
                </View>
              </Table.Cell>
              <Table.Cell width={ACTIONS_WIDTH} className="items-center justify-start px-2 py-2.5">
                <Pressable onPress={stopRowPress}>
                  <RowActionsCell
                    field={field}
                    isSelected={isSelected}
                    onOpen={() => openField(field.id)}
                    onToggleCompare={() => toggleSelected(field.id)}
                    testID={testID}
                  />
                </Pressable>
              </Table.Cell>
            </Pressable>
          );
        })}
      </Table>

      {total > pageSize ? (
        <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-border px-[14px] py-[11px]">
          <Text className="text-xs text-muted-foreground">
            Showing <Text className="font-mono text-xs text-foreground">{startRow}–{endRow}</Text> of{' '}
            <Text className="font-mono text-xs text-foreground">{total}</Text> fields
          </Text>
          <View className="flex-row items-center gap-[5px]">
            <Button
              variant="outline"
              size="sm"
              className="h-auto rounded-[7px] px-[11px] py-[6px]"
              disabled={page <= 0}
              onPress={() => setPage(page - 1)}
              testID={testID !== undefined ? `${testID}-prev` : undefined}
            >
              <View className="flex-row items-center gap-[5px]">
                <ChevronLeft size={14} color={colors.foreground} />
                <Text className="text-xs font-medium text-foreground">Prev</Text>
              </View>
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i).map((pageIndex) => {
              const isActive = pageIndex === page;
              return (
                <Button
                  key={pageIndex}
                  variant="outline"
                  size="sm"
                  onPress={() => setPage(pageIndex)}
                  // Reference: `border-radius:7px;padding:6px 9px`, and
                  // its generic `button[data-active="true"]` rule (border/
                  // background/text → accent, 12% tint) — same rule
                  // already applied to KpiStrip/sort-headers, not just
                  // `colors.primary` on the border/text alone. Inactive
                  // buttons only ever change `border-color` on hover, so
                  // `hover:bg-card` cancels the shared outline variant's
                  // `hover:bg-surface` (twMerge keeps the later class in
                  // the same utility group).
                  className="h-auto min-w-8 rounded-[7px] px-[9px] py-[6px] hover:border-accent hover:bg-card"
                  style={
                    isActive
                      ? { borderColor: colors.accent, backgroundColor: tint(colors.accent, 12) }
                      : undefined
                  }
                  testID={testID !== undefined ? `${testID}-page-${pageIndex + 1}` : undefined}
                >
                  <Text
                    className="font-mono text-xs font-semibold"
                    style={{ color: isActive ? colors.accent : colors.foreground }}
                  >
                    {pageIndex + 1}
                  </Text>
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-auto rounded-[7px] px-[11px] py-[6px]"
              disabled={page >= pageCount - 1}
              onPress={() => setPage(page + 1)}
              testID={testID !== undefined ? `${testID}-next` : undefined}
            >
              <View className="flex-row items-center gap-[5px]">
                <Text className="text-xs font-medium text-foreground">Next</Text>
                <ChevronRight size={14} color={colors.foreground} />
              </View>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
};