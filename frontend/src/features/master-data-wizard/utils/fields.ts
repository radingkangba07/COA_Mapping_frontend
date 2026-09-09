import { needsReview, impactRank } from './taxonomy';
import type { EntityField, EntityMetric, EntityPack, Impact } from '../dp-kit/types/entity';

export function matchesCategory(field: EntityField, categoryId: string): boolean {
  if (categoryId === 'all') return true;
  if (categoryId === 'blockers') return field.impact === 'blocker';
  return (field.categories ?? []).includes(categoryId);
}

export type SortKey =
  | 'name'
  | 'sample'
  | 'role'
  | 'datatype'
  | 'nullCount'
  | 'populated'
  | 'distinct'
  | 'findings'
  | 'confidence'
  | 'impact'
  | null;

/**
 * The fields table's full sort-comparator table — every column sortable,
 * matching the reference. `sample` sorts by `field.semantic` (not the
 * displayed sample text) — the reference's own quirk, replicated as-is.
 * `populated` deliberately does NOT mirror the reference's own comparator
 * (which reuses `nullCount` verbatim, sorting "Populated Rows" backwards) —
 * per INTEGRATION.md's "raise, don't faithfully reproduce" guidance, this
 * uses the field's actual populated count instead.
 */
export function sortValueFor(field: EntityField, key: SortKey, rowCount: number): string | number {
  switch (key) {
    case 'name': return field.name;
    case 'sample': return field.semantic ?? '';
    case 'role': return field.role ?? '';
    case 'datatype': return field.datatype ?? '';
    case 'nullCount': return field.nullCount ?? 0;
    case 'populated': return rowCount - (field.nullCount ?? 0);
    case 'distinct': return field.distinct ?? 0;
    case 'findings': return (field.findings ?? []).length;
    case 'confidence': return field.confidence ?? 0;
    case 'impact': return impactRank(field.impact);
    default: return 0;
  }
}

/** Matches the reference's Overview-row tone rule exactly:
 *  blocker -> 'blocker', review/warning -> 'warn', everything else -> none. */
export function impactToRowTone(impact: Impact): 'blocker' | 'warn' | undefined {
  if (impact === 'blocker') return 'blocker';
  if (needsReview(impact)) return 'warn';
  return undefined;
}

export function countByCategory(fields: readonly EntityField[], categoryId: string): number {
  return fields.filter((f) => matchesCategory(f, categoryId)).length;
}

/** Read a dotted path off an object, e.g. 'duplicates.rows'. */
function dig(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Thousands-separated for numbers, passed through otherwise. Matches dp-base.js's fmt(). */
export function fmt(value: unknown): string {
  return typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
}

/** Null/populated-rate percentage, formatted to one decimal. */
export function pctOf(count: number, total: number): string {
  if (total <= 0) return '0.0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

/** Uniqueness (already a 0-100 percentage from the profiler) to one decimal. */
export function uniquenessPct(value: number | undefined): string {
  return value !== undefined ? `${value.toFixed(1)}%` : '—';
}

/** Confidence, rounded to a whole number — unlike uniqueness, shown with no decimals. */
export function confidencePct(value: number | undefined): string {
  return value !== undefined ? `${Math.round(value)}%` : '—';
}

/**
 * Display-only formatting for a raw field identifier/role — replaces
 * underscores with spaces and capitalizes each word's first letter, e.g.
 * "identifier_candidate" -> "Identifier Candidate", "account_no" -> "Account
 * No". Live-profiled packs send `role` as the backend's raw snake_case
 * semantic_role, and `name` as the raw source column name; fixture packs'
 * `role`/`name` are already display-ready (e.g. "Identifier candidate",
 * "SKU", "UOM"). Only ever uppercases a word's first character and leaves
 * the rest untouched — never lowercases — so an already-cased acronym like
 * "SKU"/"UOM" survives unchanged instead of being mangled to "Sku"/"Uom".
 * Formats the label shown to the user only — never mutates the underlying
 * field, since DrawerHeader compares `field.role` against exact fixture
 * strings (e.g. 'Identifier candidate') elsewhere, and `field.name` is
 * reused verbatim in approval titles/messages.
 */
export function humanizeLabel(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) return '—';
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const GENERIC_COMPARISON_NOTE =
  'These fields have distinct semantics and low value overlap.';
const OVERLAPPING_COMPARISON_NOTE =
  'The two fields describe overlapping semantics — likely a hierarchy rather than independent attributes.';

export interface FieldComparisonSide {
  readonly name: string;
  readonly role: string;
  readonly nullRate: string;
  readonly cardinality: string;
  readonly sample: string;
  readonly semanticRole: string;
}

export interface FieldComparison {
  readonly a: FieldComparisonSide;
  readonly b: FieldComparisonSide;
  readonly overlap: string;
  readonly note: string;
}

/**
 * Mirrors the reference's own `cmpView()` fallbacks exactly — confirmed
 * against its source, not guessed:
 * `cardinality:(f.compare && f.compare.cardinality) || String(f.distinct)`
 * and `sem:(f.compare && f.compare.sem) || f.role`. The previous version
 * here fell back to `field.cardinality` (the root categorical label, e.g.
 * "High") and `field.semantic` (a different, business-meaning field) —
 * neither is what the reference falls back to, so a field with no
 * `compare` block (e.g. Product Name) showed the wrong value in both
 * cells. `String(field.distinct)` deliberately has no comma grouping,
 * matching the reference's own un-formatted fallback exactly.
 */
function comparisonSide(field: EntityField, rowCount: number): FieldComparisonSide {
  return {
    name: field.name,
    role: field.role ?? '—',
    nullRate: pctOf(field.nullCount ?? 0, rowCount),
    cardinality: field.compare?.cardinality ?? (field.distinct !== undefined ? String(field.distinct) : '—'),
    sample: field.sample && field.sample.length > 0 ? field.sample.slice(0, 3).join(', ') : '—',
    semanticRole: field.compare?.sem ?? field.role ?? '—',
  };
}

/**
 * Mirrors the reference's cmpView()/compare object exactly: overlap is
 * stored untrimmed in the data (e.g. "71% with Category" — confirmed
 * against items.entity.json), so the " with X" suffix is trimmed here,
 * not upstream.
 */
export function buildFieldComparison(a: EntityField, b: EntityField, rowCount: number): FieldComparison {
  const compareData = a.compare ?? b.compare;
  return {
    a: comparisonSide(a, rowCount),
    b: comparisonSide(b, rowCount),
    overlap: compareData?.overlap ? compareData.overlap.replace(/ with.*/, '') : 'not computed',
    note: compareData?.overlap ? OVERLAPPING_COMPARISON_NOTE : GENERIC_COMPARISON_NOTE,
  };
}

export interface BuiltMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: 'blocker' | 'warn' | 'neutral';
  readonly tip: string;
  readonly highlight: readonly string[];
}

/**
 * Builds the KPI strip from pack.metrics[] — every value is COMPUTED off
 * pack.fields, never a literal, so the Customers build shows Customers
 * totals with no code change. Mirrors dp-base.js's buildMetrics() exactly.
 *
 * Decisions (confirmed/ignored) aren't tracked yet — that overlay is
 * DA-321's job — so reviewCount currently counts every needs-review field.
 */
export function buildMetrics(pack: EntityPack): BuiltMetric[] {
  const fields = pack.fields;
  const metrics: readonly EntityMetric[] = pack.metrics ?? [];

  return metrics.map((m): BuiltMetric => {
    let value: string;
    switch (m.kind) {
      case 'rowCount':
        value = fmt(pack.source.rowCount ?? 0);
        break;
      case 'fieldCount':
        value = fmt(fields.length);
        break;
      case 'impactCount':
        value = fmt(fields.filter((f) => f.impact === m.impact).length);
        break;
      case 'sumNulls':
        value = fmt(fields.reduce((sum, f) => sum + (f.nullCount ?? 0), 0));
        break;
      case 'reviewCount':
        value = fmt(fields.filter((f) => needsReview(f.impact)).length);
        break;
      case 'fieldStat': {
        const field = fields.find((f) => f.id === m.field);
        const raw = field ? dig(field, m.path ?? '') : undefined;
        value = raw === undefined || raw === null ? '—' : fmt(raw);
        break;
      }
      default:
        value = '—';
    }

    return {
      id: m.id,
      label: m.label,
      value,
      tone: m.tone ?? 'neutral',
      tip: m.tip ?? '',
      highlight: m.highlight ?? [],
    };
  });
}
