/* ============================================================================
   csv.ts  ·  Minimal CSV parsing
   ----------------------------------------------------------------------------
   parseCSV() is the character-by-character streaming parser that already
   shipped inline in screens/MasterDataUploadScreen.tsx — promoted here so it
   has one home instead of two. It supersedes the line-split-first "port of
   dp-base.js" this file previously carried: that version broke on a quoted
   field containing an embedded newline (dp-base.js accepts that trade-off for
   a "minimal RFC-ish" parser; this app's upload flow cannot — real source
   extracts do carry multi-line quoted values, e.g. addresses). colIndex() /
   normaliseColumnName() are still a direct port of dp-base.js — that half had
   no such limitation.

   Step 1 (Upload) is the only step this runs on, before any profile exists —
   nothing here reads `fields` (root CLAUDE.md, wizard rule: Step 1 must never
   read `fields`).
   ========================================================================= */

/**
 * Streaming CSV parse: handles quoted fields containing commas, embedded
 * newlines, and escaped ("") quotes. Rows that are entirely blank are dropped.
 */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(field);
      field = '';
    } else if (ch === '\n') {
      cells.push(field);
      rows.push(cells);
      cells = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || cells.length > 0) {
    cells.push(field);
    rows.push(cells);
  }
  return rows.filter((row) => row.some((cell) => cell.trim() !== ''));
}

/** Case- and punctuation-insensitive header name normalisation, shared with columnCheck.ts. */
export function normaliseColumnName(s: string | undefined | null): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Match a header by name, ignoring case and punctuation — port of dp-base.js's colIndex(). Returns -1 if not found. */
export function colIndex(header: string[], name: string): number {
  const want = normaliseColumnName(name);
  return header.findIndex((h) => normaliseColumnName(h) === want);
}
