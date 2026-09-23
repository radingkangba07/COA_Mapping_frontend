import type { EntityMapping, EntityReadiness } from '../dp-kit/types/entity';
import type { BuiltMetric } from './fields';
import { fmt } from './fields';

/** `MappingCard.impact` (impact family) -> `BuiltMetric.tone` (metricTone
 *  family) — both semantic families already exist in dp-taxonomies.json;
 *  this only translates between them, it never invents a colour. Falls
 *  back to 'neutral' for an impact value outside the 4 the taxonomy
 *  actually uses for mapping cards (clean/review/blocker/na), rather than
 *  throwing — `semantic()` itself is still the one place allowed to throw
 *  on a truly unknown state. */
function cardTone(impact: string | undefined): BuiltMetric['tone'] {
  switch (impact) {
    case 'clean': return 'ok';
    case 'review': return 'warn';
    case 'blocker': return 'blocker';
    case 'na': return 'muted';
    default: return 'neutral';
  }
}

const CARD_TIPS: Readonly<Record<string, string>> = {
  high: 'Confidence at or above the auto-accept threshold — safe to accept without individual review.',
  review: 'A mapping is proposed but needs your confirmation before it writes anything.',
  none: 'No compatible target found, or the target field cannot be imported as-is.',
  missing: 'A required target field has no source column supplying it.',
  excluded: 'Deliberately left out of the migration.',
};

/**
 * Builds the Mapping step's 5 KPI/filter cards from `pack.mapping` —
 * counts are COMPUTED from `proposals`/`missingTargets` filtered by each
 * card's own `statuses` list (per entity.d.ts's own comment: "Counts are
 * COMPUTED... never literal"), never read as a literal count off the
 * card itself. Mirrors `buildMetrics()`'s "recompute, don't trust a
 * stored number" convention (`utils/fields.ts`).
 */
export function buildMappingCards(mapping: EntityMapping | undefined): BuiltMetric[] {
  const cards = mapping?.cards ?? [];
  const proposals = mapping?.proposals ?? [];
  const missingTargets = mapping?.missingTargets ?? [];
  const allRows = [...proposals, ...missingTargets];

  return cards.map((card): BuiltMetric => {
    const statuses = card.statuses ?? [];
    const count = allRows.filter((row) => statuses.includes(row.status)).length;
    return {
      id: card.id,
      label: card.label,
      value: fmt(count),
      tone: cardTone(card.impact),
      tip: CARD_TIPS[card.id] ?? '',
      // Mapping's table filtering (DA-369/DA-372) reads `cardFilter` by
      // id directly rather than a highlight-id list — no row-level
      // highlight set is needed here the way Profile's KPI tiles use one.
      highlight: [],
    };
  });
}

/**
 * Total row count across every card, for the filter dropdown's "All
 * fields" option (DA-369) — reference: `count: fmt(stated.length)` where
 * `stated` is `proposals` + `missingTargets` combined, the same `allRows`
 * `buildMappingCards` above already computes per-card. Recomputed here
 * rather than summing the cards' own formatted `value` strings, since
 * those are already thousands-separated text, not addable numbers.
 */
export function mappingRowCount(mapping: EntityMapping | undefined): number {
  return (mapping?.proposals?.length ?? 0) + (mapping?.missingTargets?.length ?? 0);
}

function isRecommendedOrderItem(value: unknown): value is { label: string; target?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const label = (value as Record<string, unknown>).label;
  return typeof label === 'string';
}

function isEvidenceItem(value: unknown): value is { value: string; label: string } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.value === 'string' && typeof v.label === 'string';
}

/**
 * Reshapes `EntityMapping['readiness']` into `EntityReadiness` so the
 * existing, already-generic `ReadinessBanner` can render it unmodified.
 * Both are the same real shape at runtime (confirmed against the items
 * fixture) — `entity.d.ts` only types the mapping-step one more loosely
 * (`Record<string, unknown>[]`), a generated-type gap, not a data
 * difference. Reshapes with `typeof` narrowing rather than an `as` cast;
 * an entry that doesn't match the expected shape is dropped rather than
 * passed through malformed.
 */
export function toMappingReadiness(readiness: EntityMapping['readiness']): EntityReadiness | null {
  if (!readiness) return null;
  return {
    headline: readiness.headline,
    tone: readiness.tone,
    narrative: readiness.narrative,
    recommendedOrder: (readiness.recommendedOrder ?? []).filter(isRecommendedOrderItem),
    evidence: (readiness.evidence ?? []).filter(isEvidenceItem),
  };
}

/**
 * DA-401 interim mitigation (approved 2026-09-10): the real backend has
 * no `readiness` block at all, so `toMappingReadiness` above always
 * returns null against real data. Derives a lightweight headline/tone/
 * narrative client-side from real, already-computed row counts —
 * `buildMappingCards`'s own `review`/`none` statuses — so the banner has
 * something honest to show instead of nothing. Deliberately excludes the
 * `missing` count: `summary.missing_required_targets` is confirmed
 * hardcoded to 0 server-side, not real data (see mapping.service.ts's
 * doc comment). `recommendedOrder`/`evidence` stay empty — there's no
 * real per-field remediation order or deterministic evidence to back
 * them yet. Call this only as a fallback when `toMappingReadiness`
 * returns null, so real backend readiness (once it exists) always wins.
 *
 * Counts by looking up the `review`/`none` cards' own `statuses` list
 * (same technique `buildMappingCards` uses) rather than hardcoding
 * status literals — the fixture's `none` card matches both `Blocked`
 * and a legacy `Unmapped` literal, while the real backend only ever
 * produces `Blocked`; reading `mapping.cards` stays correct for both
 * without this function needing to know either convention itself.
 */
export function deriveInterimReadiness(mapping: EntityMapping | undefined): EntityReadiness | null {
  if (!mapping) return null;
  const allRows = [...(mapping.proposals ?? []), ...(mapping.missingTargets ?? [])];
  const cards = mapping.cards ?? [];
  const countForCard = (id: string): number => {
    const statuses = cards.find((c) => c.id === id)?.statuses ?? [];
    return allRows.filter((r) => statuses.includes(r.status)).length;
  };
  const reviewCount = countForCard('review');
  const noSafeTargetCount = countForCard('none');

  if (reviewCount === 0 && noSafeTargetCount === 0) {
    return {
      headline: 'Ready to continue',
      tone: 'neutral',
      narrative: 'No fields need review — every proposed mapping has a safe target.',
    };
  }
  if (noSafeTargetCount > 0) {
    return {
      headline: 'Needs attention before continuing',
      tone: 'blocker',
      narrative:
        `${noSafeTargetCount} field${noSafeTargetCount === 1 ? '' : 's'} ${noSafeTargetCount === 1 ? 'has' : 'have'} no safe target` +
        (reviewCount > 0 ? `, and ${reviewCount} more need${reviewCount === 1 ? 's' : ''} review` : '') +
        '.',
    };
  }
  return {
    headline: 'Review recommended before continuing',
    tone: 'warn',
    narrative: `${reviewCount} field${reviewCount === 1 ? '' : 's'} need review before this migration is ready.`,
  };
}
