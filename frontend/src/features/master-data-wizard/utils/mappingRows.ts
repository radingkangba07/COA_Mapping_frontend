import type { EntityMapping, Impact } from '../dp-kit/types/entity';
import type { BulkAcceptField } from '../types/decision.types';
import { mappingHandoffFind, mappingStatusImpact, mappingValidationImpact, mappingEvidenceLabel, mappingEvidenceShort, impactRank } from './taxonomy';

/** All 8 of the reference's sortable columns — DA-373/374/375 combined. */
export type MappingSortKey =
  | 'name' | 'sample' | 'role' | 'target' | 'evidence' | 'conf' | 'validation' | 'status'
  | null;
export type MappingSortDirection = 'asc' | 'desc';

export interface MappingEvidenceChip {
  readonly code: string;
  readonly short: string;
  readonly label: string;
}

/** Same row shape for both arrays (entity.d.ts's own comment), but the
 *  generated types differ slightly in which fields are required — union
 *  covers both without an `as` cast. */
type MappingSourceRow =
  | NonNullable<EntityMapping['proposals']>[number]
  | NonNullable<EntityMapping['missingTargets']>[number];

/**
 * View-model for one mapping-table row — DA-373's columns 1-5 plus
 * DA-374's Proposed Target (column 6). Grows again in DA-375 (evidence/
 * confidence/validation/status).
 */
export interface MappingRow {
  readonly id: string;
  /** No fallback — a `missingTargets` row can genuinely have no source
   *  column (nothing to name), matching the reference exactly. */
  readonly name: string | undefined;
  readonly sdtype: string;
  readonly role: string;
  readonly samples: readonly string[];
  /** First 3 samples joined, reference: `samples.slice(0,3).join('  ·  ')
   *  || '—'`. */
  readonly sampleLine: string;
  readonly status: string;
  /** Raw proposed target id, before any override — undefined when no
   *  target was proposed at all. */
  readonly targetId: string | undefined;
  /** Resolved via `mapping.targetFields` — reference: `t ? t.label :
   *  'Not mapped'`. */
  readonly targetLabel: string;
  readonly targetDtype: string;
  /** Raw handoff label (e.g. "Ready") — undefined when there's nothing
   *  left to do before this mapping would import cleanly. */
  readonly handoff: string | undefined;
  /** `find`-family semantic state for the handoff chip. */
  readonly handoffFind: string;
  /** Evidence codes resolved to their chip display/tooltip text. */
  readonly evidence: readonly MappingEvidenceChip[];
  readonly conf: number | undefined;
  /** Raw validation label (e.g. "Compatible") — reference: `r.validation
   *  || '—'`. */
  readonly validation: string;
  readonly validationImpact: Impact;
  /** `impact`-family state for the Status badge — `status` itself
   *  (DA-373) is always present, non-optional. */
  readonly statusImpact: Impact;
  /** ai — why this target was proposed, shown in the detail drawer only.
   *  The real backend has no equivalent field yet (mapping.service.ts's
   *  DTO never sets it), so this is undefined for real data today — same
   *  honest gap as sdtype/role/samples until the backend adds it. */
  readonly why: string | undefined;
}

function toMappingRow(row: MappingSourceRow, targetFieldsById: ReadonlyMap<string, NonNullable<EntityMapping['targetFields']>[number]>): MappingRow {
  const samples = row.samples ?? [];
  // entity-mapping.schema.ts parses targetId/handoff as `.nullable()` — the
  // real customers fixture's cm1 row has `handoff: null` — but entity.d.ts's
  // generated type only says `string | undefined`. Normalized to undefined
  // here (once) so nothing downstream needs to special-case null.
  const targetId = row.targetId ?? undefined;
  const handoff = row.handoff ?? undefined;
  const target = targetId ? targetFieldsById.get(targetId) : undefined;
  // `conf`/`validation` are also `.nullable()` in the zod schema — same
  // null-vs-undefined generated-type gap as targetId/handoff above.
  const conf = row.conf ?? undefined;
  const validation = row.validation ?? undefined;
  return {
    id: row.id,
    name: row.name,
    sdtype: row.sdtype ?? '—',
    role: row.role ?? '—',
    samples,
    sampleLine: samples.slice(0, 3).join('  ·  ') || '—',
    status: row.status,
    targetId,
    targetLabel: target ? target.label : 'Not mapped',
    targetDtype: target?.dtype ?? '',
    handoff,
    handoffFind: mappingHandoffFind(handoff),
    evidence: (row.evidence ?? []).map((code) => ({
      code,
      short: mappingEvidenceShort(code),
      label: mappingEvidenceLabel(code),
    })),
    conf,
    validation: validation ?? '—',
    validationImpact: mappingValidationImpact(validation),
    statusImpact: mappingStatusImpact(row.status),
    why: row.why ?? undefined,
  };
}

/**
 * Concatenates `proposals` + `missingTargets` and applies the active
 * card filter — reference: `card.statuses.indexOf(r.status) >= 0`, a
 * hard filter that removes non-matching rows entirely (never a dim),
 * matching `buildMappingCards()`'s own note that Mapping's table
 * filtering reads `cardFilter` directly rather than a highlight-id set.
 */
export function buildMappingRows(mapping: EntityMapping | undefined, cardFilter: string | null): MappingRow[] {
  const allRows: MappingSourceRow[] = [...(mapping?.proposals ?? []), ...(mapping?.missingTargets ?? [])];
  const card = mapping?.cards?.find((c) => c.id === cardFilter);
  const statuses = card?.statuses ?? [];
  const filtered = card ? allRows.filter((r) => statuses.includes(r.status)) : allRows;
  const targetFieldsById = new Map((mapping?.targetFields ?? []).map((t) => [t.id, t]));
  return filtered.map((row) => toMappingRow(row, targetFieldsById));
}

/**
 * Sort value per column, operating on the already-shaped row (not the
 * raw proposal) — reference: `sample` sorts by the first raw sample,
 * never the joined `sampleLine` display string.
 */
export function mappingSortValue(row: MappingRow, key: MappingSortKey): string | number {
  switch (key) {
    case 'name': return (row.name ?? '').toLowerCase();
    case 'sample': return (row.samples[0] ?? '').toLowerCase();
    case 'role': return row.role.toLowerCase();
    // Reference: unmapped targets sort as 'zzz' — last, ascending.
    case 'target': return row.targetId === undefined ? 'zzz' : row.targetLabel.toLowerCase();
    // Reference: sorts by evidence COUNT, not content.
    case 'evidence': return row.evidence.length;
    // Reference: unscored rows sort lowest (-1), never highest.
    case 'conf': return row.conf ?? -1;
    // Reference: sorts by severity rank, not alphabetically — "worst
    // rows first" when ascending.
    case 'validation': return impactRank(row.validationImpact);
    case 'status': return impactRank(row.statusImpact);
    default: return '';
  }
}

/** DA-384: same gate the single-row Accept button already uses
 *  (MappingActionsCell's own `canAccept`) — a row can only be bulk-accepted
 *  if it actually has a proposed target and isn't already settled. */
export function canBulkAccept(row: MappingRow): boolean {
  return (row.status === 'Suggested' || row.status === 'Review required') && row.targetId !== undefined;
}

/** Builds bulkAcceptColumnMappings' per-row payload from an already-shaped
 *  MappingRow — same scale/case (Title Case validation, 0-100 confidence),
 *  so this is a plain field-rename, not a re-derivation. Callers should
 *  filter to canBulkAccept(row) first; this doesn't re-check the gate. */
export function toBulkAcceptField(row: MappingRow): BulkAcceptField {
  return {
    fieldId: row.id,
    // canBulkAccept's caller-side filter guarantees these are non-empty —
    // asserted here rather than re-validated, since 'zzz'-sorting or an
    // unfiltered call site is a caller bug, not a data-shape question.
    sourceField: row.name as string,
    targetFieldId: row.targetId as string,
    targetFieldLabel: row.targetLabel !== 'Not mapped' ? row.targetLabel : undefined,
    targetDtype: row.targetDtype || undefined,
    confidence: row.conf,
    validation: row.validation !== '—' ? row.validation : undefined,
    evidence: row.evidence.map((e) => e.code),
  };
}
