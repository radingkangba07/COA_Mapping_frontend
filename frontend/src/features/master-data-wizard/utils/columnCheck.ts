/* ============================================================================
   columnCheck.ts  ·  Uploaded header vs pack.spec.expectedColumns
   ----------------------------------------------------------------------------
   Step 1 only — `spec` is the pre-upload half of the pack (types/entity.ts);
   this never reads `fields`. Reuses csv.ts's normaliseColumnName() so a
   column named "Account No." matches an expected "Account No" the same way
   colIndex() does, with no per-entity special-casing (wizard rule #2): the
   expected list itself comes from the pack, so the same function serves all
   8 objects.
   ========================================================================= */

import { normaliseColumnName } from './csv';

/** Expected columns from pack.spec.expectedColumns that the uploaded header does not contain. */
export function missingColumns(uploadedHeader: string[], expectedColumns: string[]): string[] {
  const normalisedHeader = uploadedHeader.map(normaliseColumnName);
  return expectedColumns.filter((expected) => !normalisedHeader.includes(normaliseColumnName(expected)));
}
