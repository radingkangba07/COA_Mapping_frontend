/* ============================================================================
   previewFormat.ts  ·  shared display formatting for raw source values
   ----------------------------------------------------------------------------
   Used by MasterDataUploadScreen's CSV/Excel preview table (header row +
   sample cells) and by fields.ts's humanizeLabel, which needs the exact same
   underscore/space -> Title Case treatment for a raw field name or role
   everywhere else in the wizard that renders one as a label.

   Also the home for the defensive object/JSON -> readable-text formatter
   (formatObjectLines/formatObjectInline). Some profiler-produced values
   (e.g. a reference-integrity or enumeration breakdown) or an uploaded CSV
   column that happens to store a serialized object can reach a table cell
   as an object or a JSON string instead of a plain scalar. This file's own
   formatPreviewValue, and fields.ts's fmt(), both route through these rather
   than ever rendering raw JSON, "[object Object]", braces, brackets, or
   quotes.
   ========================================================================= */

function titleCase(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '—';
  return trimmed
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Only attempts JSON.parse when the trimmed text actually looks like one —
 *  a plain CSV cell like "N/A" or "1,234" must never be run through it. */
function tryParseJson(trimmedValue: string): unknown {
  if (!trimmedValue.startsWith('{') && !trimmedValue.startsWith('[')) return undefined;
  try {
    return JSON.parse(trimmedValue);
  } catch {
    return undefined;
  }
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (typeof value === 'string') return titleCase(value);
  if (Array.isArray(value)) return value.map(formatScalar).join(', ');
  if (isPlainObject(value)) return objectToLines(value).join(', ');
  return String(value);
}

/** One "Label: value" line per own-enumerable key, key humanized the same
 *  way a plain field label is. */
function objectToLines(obj: Record<string, unknown>): string[] {
  return Object.entries(obj).map(([key, val]) => `${titleCase(key)}: ${formatScalar(val)}`);
}

/**
 * Turns an object/array value into readable "Label: value" lines — never
 * raw JSON, braces, brackets, or quotes. A bare array of plain values
 * collapses to one comma-joined line; a bare array of objects produces one
 * set of lines per entry.
 */
export function formatObjectLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    if (value.every((item) => !isPlainObject(item))) return [value.map(formatScalar).join(', ')];
    return value.flatMap((item) => (isPlainObject(item) ? objectToLines(item) : [formatScalar(item)]));
  }
  if (isPlainObject(value)) return objectToLines(value);
  return [formatScalar(value)];
}

/** Single-line, middle-dot-joined variant of formatObjectLines — for a cell
 *  that can't wrap to multiple lines. */
export function formatObjectInline(value: unknown): string {
  return formatObjectLines(value).join(' · ');
}

/** snake_case / space-separated raw text -> Title Case. Already-cased input
 *  (e.g. "Account Number") passes through unchanged. A cell whose raw text
 *  is actually JSON (e.g. an uploaded CSV column storing a serialized
 *  object) is detected and rendered through formatObjectInline instead of
 *  being title-cased as one long, unreadable "word". */
export function formatPreviewValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '—';
  const parsed = tryParseJson(trimmed);
  if (parsed !== undefined) return formatObjectInline(parsed);
  return titleCase(trimmed);
}

export function formatPreviewHeader(col: string): string {
  return formatPreviewValue(col);
}

/** A column only counts as numeric when every non-empty cell among the
 *  previewed rows looks like a plain number (commas allowed as thousands
 *  separators) — used to right-align/left-align preview-table columns. An
 *  all-empty column is not numeric. */
export function isNumericColumn(cells: readonly string[]): boolean {
  const nonEmpty = cells.map((c) => c.trim()).filter((c) => c.length > 0);
  if (nonEmpty.length === 0) return false;
  return nonEmpty.every((c) => /^-?\d+(\.\d+)?$/.test(c.replace(/,/g, '')));
}
