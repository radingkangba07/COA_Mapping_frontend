import React from 'react';
import { View } from 'react-native';
import { StatRow } from '@/shared/components/ui/StatRow';
import { impactLabel } from '@/features/master-data-wizard/utils/taxonomy';
import { fmt, pctOf, uniquenessPct, confidencePct, impactToRowTone } from '@/features/master-data-wizard/utils/fields';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface OverviewTabProps {
  readonly field: EntityField;
  readonly rowCount: number;
}

/** The reference's 11 fixed Overview rows, in order — every value a plain
 *  toned-text row, never a badge/pill. */
export function OverviewTab({ field, rowCount }: OverviewTabProps): React.JSX.Element {
  const nullCount = field.nullCount ?? 0;
  const populated = rowCount - nullCount;
  const nullPct = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;

  return (
    <View>
      <StatRow label="Total rows" value={fmt(rowCount)} />
      <StatRow label="Populated rows" value={fmt(populated)} />
      <StatRow label="Null count" value={fmt(nullCount)} />
      <StatRow label="Null percentage" value={pctOf(nullCount, rowCount)} tone={nullPct >= 5 ? 'warn' : undefined} />
      <StatRow
        label="Distinct values"
        value={fmt(field.distinct ?? 0)}
        tip="Number of different values observed."
      />
      <StatRow
        label="Uniqueness"
        value={uniquenessPct(field.uniqueness)}
        tip="Share of rows whose value occurs only once."
      />
      <StatRow
        label="Cardinality"
        value={field.cardinality ?? '—'}
        tip="Relative number of distinct values: Low, Medium or High."
      />
      <StatRow label="Inferred datatype" value={field.datatype} />
      <StatRow label="Inferred role" value={field.role ?? '—'} />
      <StatRow label="Confidence" value={confidencePct(field.confidence)} />
      <StatRow label="Migration severity" value={impactLabel(field.impact)} tone={impactToRowTone(field.impact)} />
    </View>
  );
}
