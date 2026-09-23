import taxonomies from '../dp-kit/config/dp-taxonomies.json';
import type { Impact, StepId } from '../dp-kit/types/entity';

export interface WizardStep {
  readonly id: StepId;
  readonly label: string;
  readonly short: string;
  readonly n: number;
  readonly copilot: boolean;
}

export const STEPS: readonly WizardStep[] = taxonomies.steps.items as WizardStep[];

export function getStep(id: StepId): WizardStep {
  const step = STEPS.find((s) => s.id === id);
  if (!step) throw new Error(`dp-taxonomies: unknown step id "${id}"`);
  return step;
}

export interface ProfileFilter {
  readonly id: string;
  readonly label: string;
  readonly tip: string;
}

export const PROFILE_FILTERS: readonly ProfileFilter[] = taxonomies.profileFilters.items;

export const PAGE_SIZE: number = taxonomies.pagination.pageSize;

export const COVERAGE_DIMENSIONS: readonly string[] = taxonomies.coverageDims.items;

const NEEDS_REVIEW: readonly string[] = taxonomies.impact.needsReview;

export function needsReview(impact: Impact): boolean {
  return NEEDS_REVIEW.includes(impact);
}

const IMPACT_STATES: Record<string, { label: string; rank: number }> = taxonomies.impact.states;

export function impactLabel(impact: Impact): string {
  return IMPACT_STATES[impact]?.label ?? impact;
}

/** Migration severity sort order — 5 (blocker) down to 0 (n/a), per
 *  dp-taxonomies.json's own `rank` field ("rank drives sort order"). */
export function impactRank(impact: Impact): number {
  return IMPACT_STATES[impact]?.rank ?? 0;
}

const MAPPING_HANDOFF_STATES: Record<string, { find?: string; step?: string | null }> =
  taxonomies.mappingHandoff.states;

/** `MappingProposal.handoff` -> `find`-family semantic state, for the
 *  Proposed Target column's handoff chip. Mirrors the reference's own
 *  `mappingHandoffFind()`: falls back to 'info' for an unrecognised key. */
export function mappingHandoffFind(handoff: string | undefined): string {
  if (handoff === undefined) return 'info';
  return MAPPING_HANDOFF_STATES[handoff]?.find ?? 'info';
}

// JSON-imported object literals type their string fields as plain `string`,
// not the narrower `Impact` union, even though dp-taxonomies.json's own
// comment guarantees "Each maps onto an existing impact state" — cast at
// this one read site (not scattered) rather than typing the whole record
// loosely and losing the guarantee for callers.
const MAPPING_VALIDATION_STATES: Record<string, { impact?: string }> = taxonomies.mappingValidation.states;
const MAPPING_STATUS_STATES: Record<string, { impact?: string }> = taxonomies.mappingStatus.states;

/** `MappingProposal.validation` -> `impact`-family state, for the
 *  Validation column's badge. Mirrors the reference's own
 *  `mappingValidationImpact()`: falls back to 'na'. */
export function mappingValidationImpact(validation: string | undefined): Impact {
  if (validation === undefined) return 'na';
  return (MAPPING_VALIDATION_STATES[validation]?.impact as Impact | undefined) ?? 'na';
}

/** `MappingProposal.status` -> `impact`-family state, for the Status
 *  column's badge. Mirrors the reference's own `mappingStatusImpact()`:
 *  falls back to 'na'. */
export function mappingStatusImpact(status: string): Impact {
  return (MAPPING_STATUS_STATES[status]?.impact as Impact | undefined) ?? 'na';
}

const MAPPING_EVIDENCE_LABELS: Record<string, string> = taxonomies.mappingEvidence.labels;
const MAPPING_EVIDENCE_SHORT: Record<string, string> = taxonomies.mappingEvidence.short;

/** Evidence code -> full label (chip tooltip text). Falls back to the
 *  raw code for an unrecognised one, same looseness as the other
 *  mapping-taxonomy readers here. */
export function mappingEvidenceLabel(code: string): string {
  return MAPPING_EVIDENCE_LABELS[code] ?? code;
}

/** Evidence code -> short label (chip display text). */
export function mappingEvidenceShort(code: string): string {
  return MAPPING_EVIDENCE_SHORT[code] ?? code;
}

export type DrawerTabId = 'overview' | 'distribution' | 'issues' | 'ai';

export interface DrawerTab {
  readonly id: DrawerTabId;
  readonly label: string;
}

/**
 * The reference's own 4th tab ("AI interpretation") is unreachable in the
 * reference itself — its content-gating flag (isMigration) never matches
 * any real tab id, confirmed by exhaustive scan of every `drawerTab:`
 * assignment and `isMigration` occurrence in the reference source: the
 * severity badge / "why this severity" reasoning / migration note / Actions
 * buttons it was meant to hold never actually render there, on any field.
 * That content was folded into Issues instead (which already holds the
 * reference's own reachable interpretation/reasoning pair), so this 4th tab
 * carries no unique content here either — the button is kept only for
 * visual parity with the reference's tab bar, by explicit request, and its
 * panel is intentionally empty, matching the reference's own dead end.
 *
 * dp-taxonomies.json's own `drawerTabs.items` (7 dynamic, per-field-gated
 * tabs) is left untouched — that file is marked verbatim/unchanged in the
 * handover docs, and it models a different, dynamic-tab design this build
 * deliberately doesn't reproduce.
 */
export const DRAWER_TABS: readonly DrawerTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'distribution', label: 'Distribution' },
  { id: 'issues', label: 'Issues' },
  { id: 'ai', label: 'AI interpretation' },
];
