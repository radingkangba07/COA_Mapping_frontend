import React from 'react';
import { Text, View } from 'react-native';
import { StatTable, type StatTableRow } from '@/shared/components/ui/StatTable';
import { InvalidValuesTable } from './InvalidValuesTable';
import { fmt } from '@/features/master-data-wizard/utils/fields';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface DistributionTabProps {
  readonly field: EntityField;
  readonly rowCount: number;
}

/** Mutually-exclusive rows — first matching shape wins, matching the
 *  reference's own if/else-if chain over range/dateProfile/text/nearEmpty. */
function exclusiveStatsRows(field: EntityField, rowCount: number): StatTableRow[] {
  if (field.range) {
    const r = field.range;
    const rows: StatTableRow[] = [
      { label: 'Minimum', value: r.min ?? '—' },
      { label: 'Maximum', value: r.max ?? '—' },
      { label: 'Median', value: r.median ?? '—' },
      { label: '95th percentile', value: r.p95 ?? '—' },
      { label: 'Outlier count', value: fmt(r.outliers ?? 0), tone: (r.outliers ?? 0) > 0 ? 'warn' : undefined },
    ];
    if (r.method) rows.push({ label: 'Outlier method', value: r.method });
    if (r.examples) rows.push({ label: 'Example outliers', value: r.examples });
    return rows;
  }
  if (field.dateProfile) {
    const d = field.dateProfile;
    return [
      { label: 'Earliest value', value: d.earliest ?? '—' },
      { label: 'Latest value', value: d.latest ?? '—' },
      { label: 'Invalid dates', value: fmt(d.invalid ?? 0), tone: (d.invalid ?? 0) > 0 ? 'warn' : undefined },
      { label: 'Future-dated rows', value: fmt(d.future ?? 0), tone: (d.future ?? 0) > 0 ? 'warn' : undefined },
    ];
  }
  if (field.text) {
    const t = field.text;
    const rows: StatTableRow[] = [
      { label: 'Minimum length', value: fmt(t.minLen ?? 0) },
      { label: 'Maximum length', value: fmt(t.maxLen ?? 0) },
      { label: 'Average length', value: fmt(t.avgLen ?? 0) },
    ];
    if (field.patternAnomalies) rows.push({ label: 'Pattern anomalies', value: fmt(field.patternAnomalies), tone: 'warn' });
    return rows;
  }
  if (field.nearEmpty) {
    const n = field.nearEmpty;
    const rows: StatTableRow[] = [
      { label: 'Populated rows', value: fmt(n.populated ?? 0) },
      // Reference: `fmt(ENTITY.source.rowCount - f.nearEmpty.populated)`,
      // between "Populated %" and "Required by target" — was missing
      // entirely.
      { label: 'Null rows', value: fmt(rowCount - (n.populated ?? 0)) },
      // Reference: `pctStr(n, 1) = n.toFixed(1) + '%'` — always one
      // decimal place, not the raw unrounded number.
      { label: 'Populated %', value: n.populatedPct !== undefined ? `${n.populatedPct.toFixed(1)}%` : '—', tone: 'warn' },
      { label: 'Required by target', value: n.requiredByTarget ?? '—' },
      { label: 'Safe to exclude', value: n.safeToExclude ?? '—' },
    ];
    if (n.recommendation) rows.push({ label: 'Recommendation', value: n.recommendation });
    return rows;
  }
  return [];
}

/** Additive rows — always appended after whichever exclusive rows applied
 *  above (or standalone), matching the reference's `enumeration` handling
 *  exactly — it concatenates onto the same combined `distStats` list. */
function enumerationRows(field: EntityField): StatTableRow[] {
  const e = field.enumeration;
  if (!e) return [];
  const rows: StatTableRow[] = [];
  if (e.candidate) rows.push({ label: 'Enumeration candidate', value: e.candidate });
  rows.push({ label: 'Distinct values', value: fmt(field.distinct ?? 0) });
  rows.push({ label: 'Valid reference values', value: e.validRef !== undefined ? fmt(e.validRef) : 'undefined' });
  rows.push({
    label: 'Invalid source values',
    value: e.invalidSrc !== undefined ? fmt(e.invalidSrc) : 'undefined',
    tone: e.invalidSrc !== undefined && e.invalidSrc > 0 ? 'warn' : undefined,
  });
  if (e.affectedRows !== undefined) {
    rows.push({ label: 'Affected rows', value: fmt(e.affectedRows), tone: e.affectedRows > 0 ? 'warn' : undefined });
  }
  if (e.aliasRows !== undefined) rows.push({ label: 'Recognized alias rows', value: fmt(e.aliasRows) });
  if (e.unresolved !== undefined) {
    rows.push({ label: 'Unresolved rows', value: fmt(e.unresolved), tone: e.unresolved > 0 ? 'warn' : undefined });
  }
  if (e.categoryAvailable !== undefined) {
    rows.push({ label: 'Category available (missing rows)', value: fmt(e.categoryAvailable) });
  }
  if (e.highConf !== undefined) rows.push({ label: 'High-confidence inference', value: fmt(e.highConf) });
  if (e.ambiguous !== undefined) {
    rows.push({ label: 'Ambiguous rows', value: fmt(e.ambiguous), tone: e.ambiguous > 0 ? 'warn' : undefined });
  }
  if (e.insufficient !== undefined) {
    rows.push({ label: 'Insufficient-evidence rows', value: fmt(e.insufficient), tone: e.insufficient > 0 ? 'warn' : undefined });
  }
  if (e.refIntegrity) {
    rows.push({
      label: 'Reference integrity',
      value: e.refIntegrity,
      tone: e.refIntegrity === 'Failed' ? 'blocker' : e.refIntegrity === 'Partial' ? 'warn' : undefined,
    });
  }
  return rows;
}

export function DistributionTab({ field, rowCount }: DistributionTabProps): React.JSX.Element {
  const bars = field.dist ?? field.patterns ?? [];
  const title = field.distTitle ?? (field.dist ? 'Distribution' : 'Pattern distribution');
  const statRows = [...exclusiveStatsRows(field, rowCount), ...enumerationRows(field)];

  return (
    <View className="gap-3">
      {bars.length > 0 ? (
        <View>
          <Text className="mb-[11px] font-body text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </Text>
          <View className="gap-2.5">
            {bars.map((bar) => (
              <View key={bar.label}>
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="flex-1 font-body text-xs text-foreground" numberOfLines={1}>
                    {bar.label}
                  </Text>
                  <Text className="font-mono text-xs text-muted-foreground">{bar.pct}%</Text>
                </View>
                <View className="h-2 w-full overflow-hidden rounded-full bg-surface">
                  <View
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, Math.max(0, bar.pct ?? 0))}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <StatTable rows={statRows} />
      <InvalidValuesTable field={field} />
    </View>
  );
}
