import { useSourceProfileStore } from '../store/sourceProfile.store';

/**
 * The reference's own `runPrompt` hardcodes a real UI action per known
 * prompt id (filter the table, open a field's drawer, open the approval
 * modal, open the comparison modal, highlight rows) — mirrored here
 * exactly, not a generic/entity-agnostic mechanism, because the reference
 * itself isn't one either (its own `runPrompt` is an `if (qid ===
 * 'idprob') …` chain over this exact fixture's five prompt ids). Any other
 * prompt id (including the customers fixture's synthetic ones) safely
 * no-ops.
 *
 * Verbatim from the reference:
 *   idprob:  categoryFilter='identifiers'; filters=[{label:'Identifier problems'}]; highlightIds=filterIds=['sku','barcode']; metric=null;
 *   whysku:  evidenceId='sku'; drawerTab='issues'; highlightIds=['sku']; filterIds untouched (no dim);
 *   ignore:  highlightIds=['legacy']; categoryFilter='nearEmpty'; filterIds untouched (no dim);
 *   compare: selectedIds=['cat','ptype']; compareOpen=true; highlightIds=['cat','ptype']; filterIds untouched (no dim);
 *   autofix: highlightIds=['uom','date','ptype','sku']; filterIds untouched (no dim);
 * Only `idprob` sets `filterIds` alongside `highlightIds` — that's the one
 * prompt whose target rows also dim every other row, and the only one that
 * produces a "Visual filters" chip. The other four glow their rows without
 * dimming anything else.
 */
export function applyCopilotPromptAction(promptId: string): void {
  const profile = useSourceProfileStore.getState();

  if (promptId === 'idprob') {
    profile.setCategoryFilter('identifiers');
    profile.setPromptHighlight(['sku', 'barcode'], ['sku', 'barcode'], 'Identifier problems');
  } else if (promptId === 'whysku') {
    profile.openField('sku', 'issues');
    profile.setPromptHighlight(['sku'], [], null);
  } else if (promptId === 'ignore') {
    profile.setCategoryFilter('nearEmpty');
    profile.setPromptHighlight(['legacy'], [], null);
    profile.openApproval({ kind: 'ignore', fieldId: 'legacy' });
  } else if (promptId === 'compare') {
    profile.clearSelected();
    profile.toggleSelected('cat');
    profile.toggleSelected('ptype');
    profile.openCompare();
    profile.setPromptHighlight(['cat', 'ptype'], [], null);
  } else if (promptId === 'autofix') {
    // Reply text only otherwise — its fix-suggestion cards are DA-231/232
    // scope, not built here.
    profile.setPromptHighlight(['uom', 'date', 'ptype', 'sku'], [], null);
  }
}
