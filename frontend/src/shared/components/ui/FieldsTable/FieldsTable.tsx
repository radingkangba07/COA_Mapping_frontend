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
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { Button } from '@/shared/components/ui/Button';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { SemanticBadge } from '../SemanticBadge/SemanticBadge';
import { GradientChip } from '@/shared/components/ui/GradientChip';
import { RowActionsCell } from './RowActionsCell';
import { useSourceProfileStore, type SortKey } from '@/features/master-data-wizard/store/sourceProfile.store';
import { decisionStateFor } from '@/features/master-data-wizard/utils/decisions';
import { tint } from '@/features/master-data-wizard/utils/colorMix';
import { matchesCategory, fmt, pctOf, sortValueFor } from '@/features/master-data-wizard/utils/fields';
import { UnsortedIcon } from '@/shared/components/icons/UnsortedIcon';
import { confidenceRamp, nullRowsRamp } from '@/features/master-data-wizard/utils/metricRamp';
import { PAGE_SIZE, impactLabel } from '@/features/master-data-wizard/utils/taxonomy';
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
  readonly testID?: string;
}

// Generic opaque hex blend, two uses in this file:
// 1. The reference's row highlight (`tr[data-hl="true"]`) uses an 8% accent
//    tint — `dp-theme.ts`'s `badgeTint()` is generated/read-only and fixed
//    at 13% (for count badges), so this one-off alpha is computed locally
//    instead of adding a parameter to the generated helper. Returns a SOLID
//    (opaque) blend, not an rgba string, since it's applied to the whole
//    row (behind the transparent, non-frozen cells) — the three sticky/
//    frozen columns (checkbox, #, Field) deliberately do NOT use this: the
//    reference's own CSS gives them an unconditional, always-opaque
//    `background:var(--card)` (`td:nth-child(-n+3)`), never tinted by
//    `data-hl`/`data-dim` — confirmed by inspecting the reference source,
//    not assumed from a screenshot.
// 2. Darkening the header's rest-state text a step past `mutedForeground`
//    (user-requested readability tweak, kept on-token rather than a
//    hardcoded hex — see `HEADER_REST_TEXT` below).
function mixHex(baseHex: string, tintHex: string, alpha: number): string {
  const parse = (hex: string): readonly [number, number, number] | null => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.replace('#', ''));
    if (!m || m[1] === undefined) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const base = parse(baseHex);
  const tint = parse(tintHex);
  if (!base || !tint) return baseHex;
  const [baseR, baseG, baseB] = base;
  const [tintR, tintG, tintB] = tint;
  const mix = (b: number, t: number) => Math.round(b * (1 - alpha) + t * alpha);
  return `rgb(${mix(baseR, tintR)}, ${mix(baseG, tintG)}, ${mix(baseB, tintB)})`;
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
const HEADER_TEXT_CLASS = 'text-center font-body text-xs font-medium';

const CHECKBOX_WIDTH = 26;

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

// Widened against the reference's own min-widths (112/118/132/96 for
// Null/Populated/Distinct/Confidence) — ours were narrower across the
// board, which is why single-line headers like "Migration impact" were
// wrapping awkwardly. `populated` needed to go past the reference's own
// 118px: the browser lets a table cell grow past min-width to avoid
// wrapping "Populated Rows" mid-word, but RN's fixed-width columns can't,
// so it needs a little extra room here to fit on one sub-line. `findings`
// was already wider than the reference (240 vs 180), so left as-is rather
// than shrinking it.
const COL = {
  field: 150,
  sample: 190,
  role: 130,
  type: 70,
  nullCount: 112,
  populated: 136,
  distinct: 132,
  findings: 240,
  // Matches the reference's own 96px min-width exactly (unlike Null/
  // Populated/Distinct above, this one was never actually widened — it
  // had accidentally been set to nullCount's 112 instead).
  confidence: 96,
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

export const FieldsTable = ({ pack, highlightIds, dimIds, testID }: FieldsTableProps): React.JSX.Element => {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  // A step darker than plain `mutedForeground` for header rest-state text
  // — see HEADER_TEXT_CLASS's comment above.
  const headerRestColor = mixHex(colors.mutedForeground, colors.foreground, 0.55);
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

  const { paged, pageCount, total } = useMemo(() => {
    const filtered = pack.fields.filter((f) => matchesCategory(f, categoryFilter));
    const sorted = sortKey
      ? [...filtered].sort((a, b) => {
          const av = sortValueFor(a, sortKey, rowCount);
          const bv = sortValueFor(b, sortKey, rowCount);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sortDirection === 'asc' ? cmp : -cmp;
        })
      : filtered;

    const count = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const clampedPage = Math.min(page, count - 1);
    const rows = sorted
      .slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)
      .map((f, i) => ({ field: f, rowNo: clampedPage * PAGE_SIZE + i + 1 }));

    return { paged: rows, pageCount: count, total: sorted.length };
  }, [pack.fields, categoryFilter, sortKey, sortDirection, page, rowCount]);

  const startRow = paged.length > 0 ? (page * PAGE_SIZE) + 1 : 0;
  const endRow = paged.length > 0 ? (page * PAGE_SIZE) + paged.length : 0;

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
              className="bg-surface px-1 py-[11px]"
              style={stickyLeft(frozenLeft.checkbox)}
            >
              <View />
            </Table.HeaderCell>
            <Table.HeaderCell
              width={rowNoWidth}
              className="items-center bg-surface px-1 py-[11px]"
              style={stickyLeft(frozenLeft.rowNo)}
            >
              <Text className={HEADER_TEXT_CLASS} style={{ color: headerRestColor }}>#</Text>
            </Table.HeaderCell>
            {HEADERS.map((h, index) => (
              <Table.HeaderCell
                key={h.label}
                width={colWidths[h.col]}
                className={index === 0 ? 'bg-surface p-0' : 'p-0'}
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
                    const fg = isActive ? colors.accent : isHovered ? colors.foreground : headerRestColor;
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
                          <Text className="text-center font-body text-xs font-medium" style={{ color: fg }} numberOfLines={2}>
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
                  <Text className={`${HEADER_TEXT_CLASS} px-3 py-[11px]`} style={{ color: headerRestColor }} numberOfLines={2}>{h.label}</Text>
                )}
              </Table.HeaderCell>
            ))}
            <Table.HeaderCell width={ACTIONS_WIDTH} className="px-2 py-[11px]"><View /></Table.HeaderCell>
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
              className="flex-row border-b border-border"
              style={[
                { backgroundColor: displayBg, opacity: isDimmed ? 0.34 : 1 },
                selectedStripe as StyleProp<ViewStyle>,
              ]}
              testID={testID !== undefined ? `${testID}-row-${field.id}` : undefined}
            >
              <Table.Cell
                width={CHECKBOX_WIDTH}
                className="px-1 py-2.5"
                style={[stickyLeft(frozenLeft.checkbox), { backgroundColor: colors.card }]}
              >
                <Pressable onPress={stopRowPress} className="flex-row items-center">
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
                className="items-center px-1 py-2.5"
                style={[stickyLeft(frozenLeft.rowNo), { backgroundColor: colors.card }]}
              >
                <Text className="text-center font-mono text-xs text-muted-foreground">{rowNo}</Text>
              </Table.Cell>
              <Table.Cell
                width={COL.field}
                className="items-center px-3 py-2.5"
                style={[stickyLeft(frozenLeft.field), { backgroundColor: colors.card }]}
              >
                <View className="flex-row flex-wrap items-center justify-center gap-[7px]">
                  <Text className="text-center text-sm font-bold text-foreground">{field.name}</Text>
                  {decisionState.confirmed ? (
                    <SemanticBadge family="impact" state="clean" size="tag">CONFIRMED</SemanticBadge>
                  ) : null}
                  {decisionState.ignored ? (
                    <View className="rounded-[4px] border px-[5px] py-px" style={{ borderColor: colors.border }}>
                      <Text className="text-[10px] font-semibold" style={{ color: colors.mutedForeground }}>
                        IGNORED
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Table.Cell>
              <Table.Cell width={COL.sample} className="items-center px-3 py-2.5">
                {field.semantic ? (
                  <Text className="text-center text-xs text-muted-foreground">{field.semantic}</Text>
                ) : null}
                <Text className="mt-[3px] text-center font-mono text-xs text-muted-foreground">
                  {field.sample && field.sample.length > 0 ? field.sample.slice(0, 3).join('  ·  ') : '—'}
                </Text>
              </Table.Cell>
              <Table.Cell width={COL.role} className="items-center px-3 py-2.5">
                {field.roleTip !== undefined && field.roleTip.length > 0 ? (
                  <Tooltip content={field.roleTip} position="bottom" onPress={() => openField(field.id)}>
                    <Text className="text-center text-xs text-foreground">{field.role ?? '—'}</Text>
                  </Tooltip>
                ) : (
                  <Text className="text-center text-xs text-foreground">{field.role ?? '—'}</Text>
                )}
              </Table.Cell>
              <Table.Cell width={COL.type} className="items-center px-3 py-2.5">
                <Text className="text-center font-mono text-xs text-muted-foreground">{field.datatype}</Text>
              </Table.Cell>
              <Table.Cell width={COL.nullCount} className="items-center px-2 py-2.5">
                <GradientChip {...nullRowsRamp(field.nullCount ?? 0, rowCount)} className="self-center">
                  {fmt(field.nullCount ?? 0)}
                </GradientChip>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  {pctOf(field.nullCount ?? 0, rowCount)}
                </Text>
              </Table.Cell>
              <Table.Cell width={COL.populated} className="items-center px-2 py-2.5">
                <Text className="text-center font-mono text-xs text-muted-foreground">
                  {fmt(rowCount - (field.nullCount ?? 0))}
                </Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  {pctOf(rowCount - (field.nullCount ?? 0), rowCount)}
                </Text>
              </Table.Cell>
              <Table.Cell width={COL.distinct} className="items-center px-3 py-2.5">
                <Text className="text-center font-mono text-xs text-foreground">{fmt(field.distinct ?? 0)}</Text>
                <Text className="mt-[3px] text-center text-xs text-muted-foreground">
                  {field.uniqueness !== undefined ? `${field.uniqueness}%` : '—'}
                </Text>
              </Table.Cell>
              <Table.Cell width={colWidths.findings} className="items-center px-3 py-2.5">
                <View
                  // Reference: `display:grid;grid-template-columns:
                  // repeat(2,max-content);justify-content:center;gap:5px`
                  // — a fixed 2-column grid, not a wrap-when-it-runs-out-
                  // of-room flex row. RN has no grid primitive at all, so
                  // this is web-only (`display:'grid'` is valid web CSS,
                  // not part of RN's own `ViewStyle` union); native falls
                  // back to the previous flex-wrap approximation.
                  style={
                    isWeb
                      ? ({ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', justifyContent: 'center', gap: 5 } as unknown as ViewStyle)
                      : { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 }
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
              <Table.Cell width={COL.confidence} className="items-center px-3 py-2.5">
                <Tooltip content={CONFIDENCE_TOOLTIP} position="bottom" onPress={() => openField(field.id)}>
                  <GradientChip {...confidenceRamp(field.confidence)} size="confidence" className="self-center">
                    {field.confidence !== undefined ? `${field.confidence}%` : '—'}
                  </GradientChip>
                </Tooltip>
              </Table.Cell>
              <Table.Cell width={COL.impact} className="items-center px-3 py-2.5">
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
              </Table.Cell>
              <Table.Cell width={ACTIONS_WIDTH} className="items-center px-2 py-2.5">
                <Pressable onPress={stopRowPress}>
                  <RowActionsCell
                    field={field}
                    isSelected={isSelected}
                    onOpen={() => openField(field.id)}
                    onEdit={() => openField(field.id, 'issues')}
                    onToggleCompare={() => toggleSelected(field.id)}
                    testID={testID}
                  />
                </Pressable>
              </Table.Cell>
            </Pressable>
          );
        })}
      </Table>

      {total > PAGE_SIZE ? (
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
