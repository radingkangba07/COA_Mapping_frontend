// @ts-nocheck — vendored, read-only; verified under tsconfig.check.json's
// `strict`, not this app's stricter `noUncheckedIndexedAccess`. Do not hand-edit.
/* ============================================================================
   taxonomy.ts  ·  React port of the DPBase taxonomy helpers
   ----------------------------------------------------------------------------
   Direct translation of js/dp-base.js. The logic is identical; only the host
   framework changed. Import dp-taxonomies.json rather than redeclaring any of
   these tables — a second copy is how the four original pages forked.
   ========================================================================= */

import tax from '../config/dp-taxonomies.json';
import type { EntityField, EntityMetric, EntityPack, Impact } from '../types/entity';

/* --- formatting: one implementation, used everywhere --------------------- */
export const fmt = (n: number | string | undefined | null): string =>
  typeof n === 'number' ? n.toLocaleString('en-US') : String(n ?? '—');

export const pctStr = (n: number | undefined, d = 1): string =>
  typeof n === 'number' ? n.toFixed(d) + '%' : '—';


/* --- impact ------------------------------------------------------------- */
const STATES = tax.impact.states as Record<string, { label: string; rank: number; definition: string }>;

export const impactLabel = (id: Impact): string => STATES[id]?.label ?? id;
export const impactRank  = (id: Impact): number => STATES[id]?.rank ?? 0;
export const needsReview = (id: Impact): boolean =>
  (tax.impact.needsReview as string[]).includes(id);

/** Sort by severity descending, then by a tie-breaker key. */
export function byImpact<T extends { impact: Impact }>(items: T[], tiebreak: keyof T = 'name' as keyof T): T[] {
  return [...items].sort((a, b) => {
    const d = impactRank(b.impact) - impactRank(a.impact);
    if (d !== 0) return d;
    return String(a[tiebreak] ?? '').localeCompare(String(b[tiebreak] ?? ''));
  });
}


/* --- steps -------------------------------------------------------------- */
export const STEPS = tax.steps.items;
export const stepByIdealId = (id: string) => STEPS.find((s) => s.id === id) ?? STEPS[0];
/** The Copilot is a property of the STEP, never of the page. Step 1 has none. */
export const stepHasCopilot = (id: string) => stepByIdealId(id).copilot !== false;

export const PAGE_SIZE = tax.pagination.pageSize;
export const PROFILE_FILTERS = tax.profileFilters.items;
export const COVERAGE_DIMS = tax.coverageDims.items;


/* --- metrics -----------------------------------------------------------
   Port of DPBase.buildMetrics(). EVERY value is computed from the pack.
   Never accept a literal number in EntityMetric — the original page hardcoded
   '42,580' and the Customers build displayed Items totals.
   ---------------------------------------------------------------------- */
const dig = (obj: unknown, path?: string): unknown =>
  String(path ?? '').split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);

export interface BuiltMetric {
  id: string;
  label: string;
  value: string;
  tone: 'blocker' | 'warn' | 'neutral';
  tip: string;
  filter: string | null;
  highlight: string[];
  active: boolean;
}

export function buildMetrics(
  pack: EntityPack,
  liveFields?: EntityField[],
  activeId?: string,
): BuiltMetric[] {
  const fields = liveFields?.length ? liveFields : pack.fields ?? [];

  return (pack.metrics ?? []).map((m: EntityMetric) => {
    let value: string;
    switch (m.kind) {
      case 'rowCount':
        value = fmt(pack.source?.rowCount);
        break;
      case 'fieldCount':
        value = fmt(fields.length);
        break;
      case 'impactCount':
        value = fmt(fields.filter((f) => f.impact === m.impact).length);
        break;
      case 'sumNulls':
        value = fmt(fields.reduce((a, f) => a + (f.nullCount ?? 0), 0));
        break;
      case 'reviewCount':
        value = fmt(
          fields.filter(
            (f) => needsReview(f.impact) && !(f as any).confirmed && !(f as any).ignored,
          ).length,
        );
        break;
      case 'fieldStat': {
        const f = fields.find((x) => x.id === m.field);
        const raw = f ? dig(f, m.path) : undefined;
        value = raw === undefined || raw === null ? '—' : fmt(raw as number);
        break;
      }
      default:
        value = '—';
    }
    return {
      id: m.id,
      label: m.label,
      value,
      tone: (m.tone ?? 'neutral') as BuiltMetric['tone'],
      tip: m.tip ?? '',
      filter: m.filter ?? null,
      highlight: m.highlight ?? [],
      active: activeId === m.id,
    };
  });
}


/* --- field drawer tabs -------------------------------------------------
   A tab renders only when the field carries its backing data, so a sparse
   Customers field shows fewer tabs than a rich Items field automatically.
   ---------------------------------------------------------------------- */
const TAB_REQUIRES: Record<string, keyof EntityField | null> = {
  evidence: null,
  samples: 'sample',
  distribution: 'dist',
  duplicates: 'duplicates',
  patterns: 'patterns',
  invalid: 'invalidTable',
  interpretation: 'interpretation',
};

const TAB_LABELS: Record<string, string> = {
  evidence: 'Evidence',
  samples: 'Sample values',
  distribution: 'Distribution',
  duplicates: 'Duplicates',
  patterns: 'Patterns',
  invalid: 'Invalid values',
  interpretation: 'AI interpretation',
};

export const drawerTabsFor = (field: EntityField) =>
  Object.keys(TAB_REQUIRES)
    .filter((id) => {
      const key = TAB_REQUIRES[id];
      return key === null || field[key] != null;
    })
    .map((id) => ({ id, label: TAB_LABELS[id] }));
