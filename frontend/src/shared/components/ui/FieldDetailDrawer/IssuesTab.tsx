import React from 'react';
import { Text, View } from 'react-native';
import { colors, badgeTint } from '@/config/theme';
import { SemanticBadge } from '../SemanticBadge/SemanticBadge';
import { ProvenanceLabel } from '../ProvenanceLabel/ProvenanceLabel';
import { StatTable, type StatTableRow } from '@/shared/components/ui/StatTable';
import { fmt } from '@/features/master-data-wizard/utils/fields';
import type { EntityField } from '@/features/master-data-wizard/dp-kit/types/entity';

interface IssuesTabProps {
  readonly field: EntityField;
}

function calculatedEvidenceRows(field: EntityField): StatTableRow[] {
  const rows: StatTableRow[] = [];
  const dup = field.duplicates;
  if (dup) {
    rows.push({ label: 'Duplicate rows', value: fmt(dup.rows ?? 0) });
    rows.push({ label: 'Duplicate groups', value: fmt(dup.groups ?? 0) });
    // Reference: `if (f.duplicates.crossSub)` — truthy, not `!==
    // undefined`; a genuinely-zero count (e.g. the `barcode` fixture)
    // should hide this row, not print "0".
    if (dup.crossSub) rows.push({ label: 'Cross-subsidiary groups', value: fmt(dup.crossSub) });
    if (dup.composite && dup.composite !== '—') {
      rows.push({ label: 'Composite uniqueness (SKU + Subsidiary)', value: dup.composite });
    }
  }
  if (field.patternAnomalies) rows.push({ label: 'Pattern anomalies', value: fmt(field.patternAnomalies) });
  if (field.text) {
    rows.push({
      label: 'Length (min / max / avg)',
      value: `${field.text.minLen ?? 0} / ${field.text.maxLen ?? 0} / ${field.text.avgLen ?? 0}`,
    });
  }
  return rows;
}

function CalculatedEvidence({ field }: { readonly field: EntityField }): React.JSX.Element | null {
  const rows = calculatedEvidenceRows(field);
  if (rows.length === 0) return null;

  return (
    <View className="gap-2">
      <ProvenanceLabel state="fact">Calculated evidence</ProvenanceLabel>
      <StatTable rows={rows} />
    </View>
  );
}

/**
 * The severity badge / "Why this severity" reasoning / migration note /
 * Actions button list are deliberately absent — in the reference HTML they
 * sit behind a content gate (`isMigration: tab === 'migration'`) that no
 * real tab id ever satisfies, so that content never renders there either.
 * Confirming/ignoring a field is still available from the row's kebab menu
 * (`RowActionsMenu.tsx`), which is the reference's own reachable path for
 * those same writes.
 */
export function IssuesTab({ field }: IssuesTabProps): React.JSX.Element {
  return (
    <View className="gap-4">
      {field.findings && field.findings.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {field.findings.map((finding) => (
            <SemanticBadge key={finding.t} family="find" state={finding.tone} size="compact">
              {finding.t}
            </SemanticBadge>
          ))}
        </View>
      ) : null}

      <CalculatedEvidence field={field} />

      {field.interpretation ? (
        <View className="gap-2">
          <ProvenanceLabel state="ai">AI interpretation</ProvenanceLabel>
          <View
            className="rounded-r-lg px-3.5 py-3"
            style={{ borderLeftWidth: 2, borderLeftColor: colors.accent, backgroundColor: badgeTint(colors.accent) }}
          >
            <Text className="font-body text-sm leading-[22px] text-foreground">{field.interpretation}</Text>
          </View>
        </View>
      ) : null}

      {/* Reference: `hasReasoning` is its own sibling `sc-if`, independent
          of `hasInterpretation` — a field could carry reasoning with no
          interpretation quote box above it. */}
      {field.reasoning ? (
        <Text className="font-body text-xs leading-5 text-muted-foreground">{field.reasoning}</Text>
      ) : null}
    </View>
  );
}
