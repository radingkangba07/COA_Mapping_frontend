/* ============================================================================
   components.tsx  ·  Reference React translation of three kit patterns
   ----------------------------------------------------------------------------
   PURPOSE: show the translation pattern, not to be the finished app. Read the
   corresponding .partial.html alongside each component — the partial is the
   visual spec, this file is how it becomes React.

   THE ONLY RULE THAT MATTERS: colour comes from data-attributes, never from
   props or inline styles. That is what makes Items and Customers look identical
   for free, and it is why css/dp-semantics.css drops in unchanged.

       <span data-impact="blocker">      ✓  meaning
       <span style={{color:'#D72222'}}>  ✗  never

   Setup in the real app:
       import './dp-kit/css/dp-tokens.css';      // verbatim from the kit
       import './dp-kit/css/dp-semantics.css';   // verbatim from the kit
   ========================================================================= */

import React, { useMemo, useState } from 'react';
import type {
  EntityField, EntityPack, Impact, RetargetRequest, TargetField,
} from '../types/entity';
import {
  buildMetrics, byImpact, drawerTabsFor, fmt, impactLabel,
  PAGE_SIZE, pctStr, STEPS,
} from './taxonomy';


/* ==========================================================================
   1. StepRail  ·  spec: shell/dp-steps.partial.html
   The canonical 8 steps come from dp-taxonomies.json. Never pass labels in.
   ======================================================================== */
export function StepRail({ currentStepId }: { currentStepId: string }) {
  const current = STEPS.find((s) => s.id === currentStepId)?.n ?? 1;

  return (
    <div className="dp-steprail">
      {STEPS.map((s, i) => {
        const state = s.n < current ? 'done' : s.n === current ? 'active' : 'todo';
        return (
          <div className="dp-steprail__item" key={s.id}>
            <span className="dp-steprail__dot" data-state={state}>
              {state === 'done' ? <CheckIcon /> : s.n}
            </span>
            <span className="dp-steprail__label" data-current={s.n === current}>
              {s.short}
            </span>
            {i < STEPS.length - 1 && (
              <span className="dp-steprail__line" data-done={s.n < current} />
            )}
          </div>
        );
      })}
    </div>
  );
}


/* ==========================================================================
   2. MetricBar  ·  spec: patterns/dp-metricbar.partial.html
   Each metric doubles as a table filter. Values are COMPUTED from the pack —
   see taxonomy.buildMetrics(). Passing a literal here is a bug.
   ======================================================================== */
export function MetricBar({
  pack, fields, activeId, onSelect,
}: {
  pack: EntityPack;
  fields?: EntityField[];
  activeId?: string;
  onSelect: (id: string, highlight: string[], filter: string | null) => void;
}) {
  const metrics = useMemo(
    () => buildMetrics(pack, fields, activeId),
    [pack, fields, activeId],
  );

  return (
    <div className="dp-metricbar">
      {metrics.map((m) => (
        <button
          key={m.id}
          type="button"
          title={m.tip}
          data-active={m.active}
          className="dp-metricbar__cell"
          onClick={() => onSelect(m.id, m.highlight, m.filter)}
        >
          <span className="dp-metricbar__label">{m.label}</span>
          {/* colour via the semantic layer, never via a style prop */}
          <span className="dp-metricbar__value" data-metrictone={m.tone}>
            {m.value}
          </span>
        </button>
      ))}
    </div>
  );
}


/* ==========================================================================
   3. ReadinessBanner  ·  spec: patterns/dp-readiness.partial.html

   THREE PROVENANCE ZONES. Do not collapse them — the whole point of the
   component is that a user can tell a computed fact from a model opinion.
     headline + narrative  ->  ai      (authored / model)
     recommendedOrder      ->  action  (ai-ordered, user-invoked)
     evidence              ->  fact    (deterministic; must be reproducible)
   ======================================================================== */
export function ReadinessBanner({
  pack, onJumpToField,
}: {
  pack: EntityPack;
  onJumpToField: (fieldId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const r = pack.readiness;
  if (!r) return null;

  return (
    <section className="dp-card">
      <button type="button" className="dp-readiness__head" onClick={() => setOpen((o) => !o)}>
        <SparkleIcon />
        <span className="dp-readiness__headline" data-metrictone={r.tone ?? 'warn'}>
          {r.headline}
        </span>
        <span className="dp-readiness__toggle">{open ? 'Show less' : 'Show more'}</span>
      </button>

      {/* ai — a judgement, clamped to two lines when collapsed */}
      <p className="dp-readiness__narrative" data-clamped={!open}>
        {r.narrative}
      </p>

      {open && (
        <>
          <div className="dp-readiness__actions">
            <span data-prov="action" className="dp-eyebrow">
              <span className="dp-dot" />Recommended order
            </span>
            {(r.recommendedOrder ?? []).map((a, i) => (
              <button
                key={a.label}
                type="button"
                className="dp-chip"
                onClick={() => a.target && onJumpToField(a.target)}
              >
                <span className="dp-chip__n">{i + 1}</span>
                {a.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="dp-linkbtn"
            onClick={() => setEvidenceOpen((o) => !o)}
          >
            <EyeIcon />
            {evidenceOpen ? 'Hide supporting evidence' : 'Show supporting evidence'}
          </button>

          {evidenceOpen && (
            <div className="dp-evidence">
              {/* fact — this label is a promise. If a number here cannot be
                  recomputed by the profiler, it does not belong in this block. */}
              <div className="dp-evidence__head">
                <span data-prov="fact" className="dp-eyebrow">
                  <span className="dp-dot" />Calculated evidence
                </span>
                <span className="dp-muted">— deterministic profiling, not model output</span>
              </div>
              <dl className="dp-evidence__grid">
                {(r.evidence ?? []).map((e) => (
                  <div key={e.label}>
                    <dt className="dp-mono">{e.value}</dt>
                    <dd className="dp-muted">{e.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}
    </section>
  );
}


/* ==========================================================================
   4. FieldTable  ·  spec: patterns/dp-datatable.partial.html
   Sticky first three columns come from dp-semantics.css — do not reimplement
   them here. Severity sort uses IMPACT_RANK via byImpact().
   ======================================================================== */
export function FieldTable({
  fields, highlightIds = [], selectedIds = [], onOpen,
}: {
  fields: EntityField[];
  highlightIds?: string[];
  selectedIds?: string[];
  onOpen: (fieldId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => byImpact(fields, 'name'), [fields]);
  const rows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.ceil(sorted.length / PAGE_SIZE);

  return (
    <div className="dp-card">
      <table>
        <thead>
          <tr>
            <th /><th /><th>Field</th>
            <th>Role</th><th>Type</th><th>Nulls</th>
            <th>Distinct</th><th>Unique</th><th>Impact</th><th>Findings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr
              key={f.id}
              data-clickable="true"
              data-hl={highlightIds.includes(f.id)}
              data-dim={highlightIds.length > 0 && !highlightIds.includes(f.id)}
              data-sel={selectedIds.includes(f.id)}
              onClick={() => onOpen(f.id)}
            >
              <td><input type="checkbox" readOnly checked={selectedIds.includes(f.id)} /></td>
              <td><CaretIcon /></td>
              <td>
                <div className="dp-field__name">{f.name}</div>
                <div className="dp-muted">{f.semantic}</div>
              </td>
              <td title={f.roleTip}>{f.role}</td>
              <td className="dp-mono">{f.datatype}</td>
              <td className="dp-mono">{fmt(f.nullCount)}</td>
              <td className="dp-mono">{fmt(f.distinct)}</td>
              <td className="dp-mono">{pctStr(f.uniqueness)}</td>
              <td>
                {/* the entire severity colour system, in one attribute */}
                <span className="dp-pill" data-impact={f.impact} title={f.impactReason}>
                  {impactLabel(f.impact as Impact)}
                </span>
              </td>
              <td>
                {(f.findings ?? []).map((fd) => (
                  <span key={fd.t} className="dp-pill" data-find={fd.tone}>{fd.t}</span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="dp-pager">
          <span className="dp-muted">
            Showing <span className="dp-mono">{page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, sorted.length)}</span> of{' '}
            <span className="dp-mono">{sorted.length}</span> fields
          </span>
          <div>
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" data-active={i === page} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="dp-empty">
          <div>No fields match this filter</div>
          <div className="dp-muted">Try a different profile category or clear the active filter.</div>
        </div>
      )}
    </div>
  );
}


/* ==========================================================================
   5. ApprovalModal  ·  spec: patterns/dp-approval.partial.html

   THE ENFORCEMENT POINT. No AI-inferred value is written without passing
   through here. If you add an inference anywhere in the product, route it
   through this component — that invariant is the product's credibility.
   ======================================================================== */
export function ApprovalModal({
  title, detail, preview, onConfirm, onCancel,
}: {
  title: string;
  detail: string;
  preview?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="dp-scrim" onClick={onCancel} />
      <div className="dp-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <p className="dp-muted">{detail}</p>
        </header>

        <div className="dp-modal__body">
          {previewOpen && preview && (
            <div className="dp-preview">
              <div className="dp-eyebrow">Preview of change</div>
              <pre className="dp-mono">{preview}</pre>
            </div>
          )}
          <p className="dp-muted">
            Nothing is written until you confirm. This action is recorded in applied decisions.
          </p>
        </div>

        <footer>
          <button type="button" onClick={() => setPreviewOpen((o) => !o)}>
            {previewOpen ? 'Hide preview' : 'Preview of change'}
          </button>
          <div>
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" data-primary="true" onClick={onConfirm}>Apply</button>
          </div>
        </footer>
      </div>
    </>
  );
}


/* ==========================================================================
   6. TargetCell  ·  spec: pages/mapping.page.html (Proposed target column)

   MANUAL TARGET OVERRIDE. A user may reject the AI's proposal and pick the
   target field themselves.

   THREE THINGS THIS COMPONENT EXISTS TO DEMONSTRATE, all of which are easy to
   get wrong and none of which are cosmetic:

     1. SAVING DOES NOT WRITE. onRequestChange raises an approval request; the
        parent opens ApprovalModal and only writes on confirm. If you wire Save
        straight to a mutation you have broken the one invariant the product
        sells.

     2. PROVENANCE FLIPS. Once a human sets the target, the cell is
        data-prov="action", not "ai". The model no longer owns that decision and
        the UI must stop implying it does.

     3. OPTIONS COME FROM THE PACK. targetFields is the target ERP's catalogue
        for this record. Never hardcode a field list, and never filter it per
        entity — that is the 64-pages road. Read-only targets stay selectable
        but are labelled, so a later write failure is explainable at the point
        of choosing.

   The empty-string option is deliberate: a user must be able to UNSET a wrong
   proposal, not only replace it.
   ======================================================================== */
export function TargetCell({
  fieldId, fieldName, targetId, targetFields, isOverridden,
  editing, onBeginEdit, onCancelEdit, onRequestChange,
}: {
  fieldId: string;
  fieldName: string;
  /** Current target: the override if one exists, otherwise the proposal. */
  targetId: string;
  targetFields: TargetField[];
  /** True once a human has set this target through the approval modal. */
  isOverridden: boolean;
  editing: boolean;
  onBeginEdit: (fieldId: string) => void;
  onCancelEdit: () => void;
  /** Raises an approval request. MUST NOT write. */
  onRequestChange: (req: RetargetRequest) => void;
}) {
  const [draft, setDraft] = useState(targetId);
  const current = targetFields.find((t) => t.id === targetId);

  if (!editing) {
    return (
      <td onClick={(e) => e.stopPropagation()}>
        <div className="dp-field__name">{current ? current.label : 'Not mapped'}</div>
        <div className="dp-mono dp-muted">{current?.dtype ?? ''}</div>
        {isOverridden && (
          <span data-prov="action" title="Target set manually and approved by you">
            Set manually
          </span>
        )}
      </td>
    );
  }

  return (
    <td onClick={(e) => e.stopPropagation()}>
      <label className="dp-muted" htmlFor={`tgt-${fieldId}`}>Target field</label>
      <select
        id={`tgt-${fieldId}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      >
        <option value="">Not mapped</option>
        {targetFields.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
            {t.dtype ? ` · ${t.dtype}` : ''}
            {t.writable === false ? ' · read-only' : ''}
          </option>
        ))}
      </select>
      <div>
        <button
          type="button"
          data-primary="true"
          onClick={() => {
            if (draft === targetId) { onCancelEdit(); return; }   // nothing to approve
            onRequestChange({ fieldId, targetId: draft, previousTargetId: targetId });
          }}
        >
          Save
        </button>
        <button type="button" onClick={onCancelEdit}>Cancel</button>
      </div>
      <span className="dp-muted">
        Saving asks for your approval before the mapping changes.
      </span>
      {/* fieldName is shown in the approval detail, not here */}
      <span hidden>{fieldName}</span>
      <button type="button" hidden onClick={() => onBeginEdit(fieldId)} />
    </td>
  );
}


/* --- icon stubs: replace with your icon library ------------------------- */
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><path d="M20 6 9 17l-5-5" /></svg>;
const CaretIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>;
const EyeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
const SparkleIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.9 4.8L18.6 9.6 13.9 11.5 12 16.3 10.1 11.5 5.4 9.6l4.7-1.8z" /></svg>;
