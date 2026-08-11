/* ============================================================================
   dp-base.js  ·  DPBase — the shared DCLogic base class
   ----------------------------------------------------------------------------
   Every DataPortation page extends DPBase instead of DCLogic:

       class Component extends DPBase {
         entity = ENTITY;                       // the entity pack
         stepId = 'profile';                    // which of the 8 steps this is
         state = { ...DPBase.shellState, ... }; // page state on top of shell state

         renderVals() {
           return { ...this.shellVals(), ...myPageVals };
         }
       }

   DPBase owns: theme, nav rail, project sidebar, members, step rail, Copilot
   panel state, and every taxonomy lookup. A page never re-implements these —
   that duplication is precisely what produced four divergent shells.

   NOTHING in this file mentions Items. All entity-specific values arrive via
   `this.entity` (an entity pack) so the same code drives Customers unchanged.

   Behaviour lifted verbatim from the standard page's renderVals() so the
   rebuilt page is pixel-identical.
   ========================================================================= */

/* --- number formatting: one implementation, used everywhere -------------- */
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);
const pct = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) + '%' : n);


/* --- Taxonomies ----------------------------------------------------------
   Mirrors config/dp-taxonomies.json. build/assemble.py injects the JSON and
   overwrites DP_TAX, so edit the JSON — this literal is only the fallback that
   keeps a page runnable standalone.
   ------------------------------------------------------------------------ */
const DP_TAX = {
  impact: {
    order: ['blocker', 'review', 'warning', 'resolved', 'clean', 'na'],
    needsReview: ['blocker', 'review', 'warning'],
    label: { blocker: 'Blocker', review: 'Review', warning: 'Warning', clean: 'Clean', na: 'Not applicable', resolved: 'Resolved' },
    rank:  { blocker: 5, review: 4, warning: 3, resolved: 2, clean: 1, na: 0 }
  },
  steps: [
    { n: 1, id: 'upload',     label: 'Upload Files',        short: 'Upload',     copilot: false },
    { n: 2, id: 'profile',    label: 'Source Data Profile', short: 'Profile',    copilot: true },
    { n: 3, id: 'mapping',    label: 'Field Mapping',       short: 'Mapping',    copilot: true },
    { n: 4, id: 'values',     label: 'Value Mapping',       short: 'Values',     copilot: true },
    { n: 5, id: 'formats',    label: 'Formats',             short: 'Formats',    copilot: true },
    { n: 6, id: 'validation', label: 'Validation',          short: 'Validation', copilot: true },
    { n: 7, id: 'test',       label: 'Test Import',         short: 'Test',       copilot: true },
    { n: 8, id: 'import',     label: 'Final Import',        short: 'Import',     copilot: true }
  ],
  pageSize: 30
};


/* --- Target ERP registry ------------------------------------------------
   Project-level, not entity-level: a project migrates to ONE target system,
   but many entities. Lifted from the TARGETS const in Items Master Upload.
   ------------------------------------------------------------------------ */
/* --- Taxonomy consts derived from DP_TAX --------------------------------
   Pages reference these directly (IMPACT_LABEL, PAGE_SIZE, ...). Deriving them
   here rather than redeclaring them per page is what stops the taxonomy forking:
   change dp-taxonomies.json and every page moves together.
   ------------------------------------------------------------------------ */
const IMPACT_LABEL  = DP_TAX.impact.label;
const IMPACT_RANK   = DP_TAX.impact.rank;
const NEEDS_REVIEW  = DP_TAX.impact.needsReview;
const PAGE_SIZE     = DP_TAX.pageSize || 30;
const PROFILE_FILTERS = DP_TAX.profileFilters || [];
const COVERAGE_DIMS   = DP_TAX.coverageDims || [];
const SEMANTIC_ROLES  = DP_TAX.semanticRoles || [];
const DRAWER_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'distribution', label: 'Distribution' },
  { id: 'issues',       label: 'Issues' },
  { id: 'ai',           label: 'AI interpretation' }
];

const pctStr = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) + '%' : n);

const DP_SOURCE_COLOR = '#3F3F46';   /* neutral grey: source systems are not branded */

const DP_TARGETS = [
  { id: 'odoo',      name: 'Odoo',                initials: 'Od', color: '#714B9E' },
  { id: 'netsuite',  name: 'NetSuite',            initials: 'NS', color: '#0F5A46' },
  { id: 'qbo',       name: 'QuickBooks Online',   initials: 'QB', color: '#2CA01C' },
  { id: 'xero',      name: 'Xero',                initials: 'Xe', color: '#13B5EA' },
  { id: 'intacct',   name: 'Sage Intacct',        initials: 'SI', color: '#00713D' },
  { id: 'd365',      name: 'Dynamics 365 BC',     initials: 'D3', color: '#002050' },
  { id: 'acumatica', name: 'Acumatica Cloud ERP', initials: 'A',  color: '#3F3F46' }
];


class DPBase extends DCLogic {

  /* Spread into a page's own state so shell defaults are never forgotten. */
  static shellState = {
    theme: 'light',
    railExpanded: false,
    sidebarOpen: true,
    membersOpen: true,
    copilotOpen: true
  };

  /* Overridden by the page. Defaults keep DPBase usable on its own. */
  entity = null;
  stepId = 'profile';

  /* ---------------------------------------------------------------- project
     Replace with a real project record when the app has one. Kept here rather
     than in the entity pack because it is per-project, not per-object.
     -------------------------------------------------------------------- */
  project = {
    orgName: 'Linked ERP',
    name: 'L124',
    id: '6be78188',
    createdAt: 'Jul 15, 2026 at 09:11 PM by bhavna',
    lastEdited: 'Jul 28, 2026 at 07:28 PM by bhavna',
    targetSystem: 'odoo',
    user: { name: 'bhavna', role: 'admin' },
    memberCount: 1
  };


  /* ================================================================ toggles */
  toggleTheme    = () => this.setState((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }));
  toggleRail     = () => this.setState((s) => ({ railExpanded: !s.railExpanded }));
  toggleSidebar  = () => this.setState((s) => ({ sidebarOpen: !s.sidebarOpen }));
  toggleMembers  = () => this.setState((s) => ({ membersOpen: s.membersOpen === false }));
  toggleCopilot  = () => this.setState((s) => ({ copilotOpen: !s.copilotOpen }));


  /* ============================================================ taxonomies */
  impactLabel(id)  { return (DP_TAX.impact.label || {})[id] || id; }
  impactRank(id)   { return (DP_TAX.impact.rank  || {})[id] ?? 0; }
  needsReview(id)  { return (DP_TAX.impact.needsReview || []).indexOf(id) >= 0; }

  /* Sort by severity, then by any tie-breaker key. */
  byImpact(items, tiebreak = 'name') {
    return items.slice().sort((a, b) => {
      const d = this.impactRank(b.impact) - this.impactRank(a.impact);
      return d !== 0 ? d : String(a[tiebreak] || '').localeCompare(String(b[tiebreak] || ''));
    });
  }

  step()        { return DP_TAX.steps.find((s) => s.id === this.stepId) || DP_TAX.steps[0]; }
  stepNumber()  { return this.step().n; }
  /* The Copilot is a property of the STEP, never of the page. Step 1 has none. */
  hasCopilot()  { return this.step().copilot !== false; }

  target() {
    return DP_TARGETS.find((t) => t.id === this.project.targetSystem) || DP_TARGETS[0];
  }

  /* One badge builder for both source and target, so no page hardcodes a colour. */
  badgeStyle(size, color) {
    return 'width:' + size + 'px;height:' + size + 'px;border-radius:9999px;display:flex;'
         + 'align-items:center;justify-content:center;font-size:' + (size > 26 ? 11 : 9.5) + 'px;'
         + 'font-weight:700;color:#fff;flex-shrink:0;background:' + (color || this.target().color) + ';';
  }


  /* ========================================================= entity metrics
     Computes the metric bar from entity.metrics[] against entity.fields[].
     Adding a metric to a pack requires no page change.
     -------------------------------------------------------------------- */
  /* Read a dotted path off an object, e.g. 'duplicates.rows'. */
  static dig(obj, path) {
    return String(path || '').split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  /**
   * Build the metric bar from entity.metrics[].
   *
   * EVERY value is computed from the pack — no literals. The earlier version of
   * the profile page hardcoded '42,580' and 'Invalid UOM values', which meant the
   * Customers build displayed Items totals. That class of bug is why this lives
   * here and not in a page.
   *
   * @param liveFields fields from state (carries confirmed/ignored), falls back
   *                   to the pack's fields.
   * @param activeId   the currently selected metric id.
   */
  buildMetrics(liveFields, activeId) {
    const e = this.entity;
    if (!e || !e.metrics) return [];
    const fields = (liveFields && liveFields.length) ? liveFields : (e.fields || []);

    return e.metrics.map((m) => {
      let value;
      switch (m.kind) {
        case 'rowCount':
          value = fmt(e.source && e.source.rowCount);
          break;
        case 'fieldCount':
          value = fmt(fields.length);
          break;
        case 'impactCount':
          value = fmt(fields.filter((f) => f.impact === m.impact).length);
          break;
        case 'sumNulls':
          value = fmt(fields.reduce((a, f) => a + (f.nullCount || 0), 0));
          break;
        case 'reviewCount':
          value = fmt(fields.filter((f) => this.needsReview(f.impact) && !f.confirmed && !f.ignored).length);
          break;
        case 'fieldStat': {
          const f = fields.find((x) => x.id === m.field);
          const raw = f ? DPBase.dig(f, m.path) : undefined;
          value = raw === undefined || raw === null ? '—' : fmt(raw);
          break;
        }
        default:
          value = '—';
      }
      return {
        id: m.id,
        label: m.label,
        value: String(value),
        tone: m.tone || 'neutral',
        tip: m.tip || '',
        filter: m.filter || null,
        highlight: m.highlight || [],
        active: activeId === m.id
      };
    });
  }


  /* ==================================================== Migration Copilot
     Owned by DPBase, not by pages. Every step with copilot:true gets a working
     panel for free; suggested prompts and canned answers come from the ENTITY
     PACK, so the Copilot speaks about Customers on a Customers page with no
     page-level code.

     A page may override any of these by returning its own value after the
     shellVals() spread.
     ---------------------------------------------------------------------- */

  sendPrompt = (qid, text) => this.setState((s) => {
    const seq = (s._msgSeq || 0) + 1;
    const msgs = (s.chatMessages || []).concat([{ id: 'u' + seq, role: 'user', text }]);
    return { chatMessages: msgs.concat([{ id: 'a' + seq, role: 'assistant', qid }]), _msgSeq: seq, draft: '' };
  });

  setDraft = (v) => this.setState({ draft: v });

  sendDraft = () => {
    const t = (this.state.draft || '').trim();
    if (t) this.sendPrompt(null, t);
  };

  setFeedback = (id, kind) => this.setState((s) => ({
    chatFeedback: { ...(s.chatFeedback || {}), [id]: kind },
  }));

  copilotVals() {
    const s = this.state;
    const e = this.entity || {};
    const responses = e.copilotResponses || {};
    const fixes = e.copilotFixes || {};
    const fb = s.chatFeedback || {};
    const fixStatus = s.fixStatus || {};

    const chat = (s.chatMessages || []).map((msg) => {
      if (msg.role === 'user') return { id: msg.id, isUser: true, text: msg.text };
      const r = msg.qid ? responses[msg.qid] : null;
      const list = ((r && r.fixes) || []).map((fid) => {
        const fx = fixes[fid] || {};
        const applied = fixStatus[fid] === 'applied';
        return {
          id: fid, issue: fx.issue || '', affected: fmt(fx.affected),
          action: fx.action || '', evidence: fx.evidence || '', impact: fx.impact || '',
          isAuto: !!fx.auto, needsReview: !fx.auto, applied, pending: !applied,
          onApply: () => this.setState((st) => ({ fixStatus: { ...(st.fixStatus || {}), [fid]: 'applied' } })),
          onUndo:  () => this.setState((st) => ({ fixStatus: { ...(st.fixStatus || {}), [fid]: null } })),
        };
      });
      const text = msg.text || (r && r.text)
        || 'I do not have a canned answer for that yet. Ask about a specific field and I will explain the evidence behind it.';
      return {
        id: msg.id, isAssistant: true, text,
        hasFixes: list.length > 0, fixes: list,
        isHelpful: fb[msg.id] === 'helpful',
        isIncorrect: fb[msg.id] === 'incorrect',
        isMissing: fb[msg.id] === 'missing',
        onHelpful:   () => this.setFeedback(msg.id, 'helpful'),
        onIncorrect: () => this.setFeedback(msg.id, 'incorrect'),
        onMissing:   () => this.setFeedback(msg.id, 'missing'),
        correcting: false,
        correctFields: [],
        onStartCorrect: () => {}, onCancelCorrect: () => {}, onSaveCorrect: () => {},
      };
    });

    return {
      chat,
      chatEmpty: chat.length === 0,
      hasChat: chat.length > 0,
      draft: s.draft || '',
      onDraft: (ev) => this.setDraft(ev.target.value),
      onDraftKey: (ev) => { if (ev.key === 'Enter') this.sendDraft(); },
      sendInput: this.sendDraft,
      /* A pack may store prompts as { id, text } objects or as bare strings.
         Accept both so an older pack keeps working, and key the canned answer
         off the id when one is supplied. */
      prompts: (e.copilotPrompts || []).map((p, i) => {
        const text = typeof p === 'string' ? p : (p.text || '');
        const id = (p && p.id) || Object.keys(e.copilotResponses || {})[i] || null;
        return { text, onRun: () => this.sendPrompt(id, text) };
      }),
    };
  }


  /* ================================================== field mapping (step 3)
     Rows and cards are built from entity.mapping. Status, validation and
     handoff are translated into the EXISTING impact/find tones, so a Blocked
     mapping renders identically to a blocker field on the profile page and no
     new colour enters the system.
     ---------------------------------------------------------------------- */

  mappingStatusImpact(status) {
    const st = (DP_TAX.mappingStatus && DP_TAX.mappingStatus.states) || {};
    return (st[status] && st[status].impact) || 'na';
  }

  mappingValidationImpact(v) {
    const st = (DP_TAX.mappingValidation && DP_TAX.mappingValidation.states) || {};
    return (st[v] && st[v].impact) || 'na';
  }

  mappingHandoffFind(h) {
    const st = (DP_TAX.mappingHandoff && DP_TAX.mappingHandoff.states) || {};
    return (st[h] && st[h].find) || 'info';
  }

  /** All rows for the mapping table: real proposals plus missing required targets. */
  mappingRows() {
    const m = (this.entity && this.entity.mapping) || {};
    return (m.proposals || []).concat(m.missingTargets || []);
  }

  /**
   * Decorate rows for rendering: resolve the target label, translate status /
   * validation / handoff into semantic tones, expand evidence codes to labels.
   */
  buildMappingRows(rows, opts) {
    const o = opts || {};
    const m = (this.entity && this.entity.mapping) || {};
    const byId = {};
    (m.targetFields || []).forEach((t) => { byId[t.id] = t; });
    const evLabels = (DP_TAX.mappingEvidence && DP_TAX.mappingEvidence.labels) || {};
    const evShort  = (DP_TAX.mappingEvidence && DP_TAX.mappingEvidence.short) || {};
    const autoAt = m.autoAcceptAt || 95;

    return rows.map((r) => {
      const t = r.targetId ? byId[r.targetId] : null;
      const hasConf = typeof r.conf === 'number';
      return {
        id: r.id,
        name: r.name,
        sdtype: r.sdtype || '—',
        role: r.role || '—',
        samples: r.samples || [],
        hasSamples: (r.samples || []).length > 0,

        /* targetId is carried through, not just its label. The inline target
           picker needs the raw id to preselect the current value, and any
           caller comparing "what changed" needs an id rather than prose. */
        targetId: r.targetId || '',
        targetLabel: t ? t.label : 'Not mapped',
        targetDtype: t ? (t.dtype || '') : '',
        targetRequired: !!(t && t.required),

        /* one attribute carries the whole severity system */
        statusLabel: r.status,
        statusImpact: this.mappingStatusImpact(r.status),
        validationLabel: r.validation || '—',
        validationImpact: this.mappingValidationImpact(r.validation),

        hasHandoff: !!r.handoff,
        handoffLabel: r.handoff || '',
        handoffFind: this.mappingHandoffFind(r.handoff),

        hasConf,
        noConf: !hasConf,
        confLabel: hasConf ? r.conf + '%' : '—',
        /* tone by band, not by an inline colour */
        confTone: !hasConf ? 'muted'
          : (r.conf >= autoAt ? 'ok' : (r.conf >= 70 ? 'warn' : 'blocker')),

        evidence: (r.evidence || []).map((e) => ({
          code: e, label: evShort[e] || e, title: evLabels[e] || e,
        })),

        hasWhy: !!r.why,
        why: r.why || '',

        isSelected: o.selectedId === r.id,
        canAccept: r.status === 'Suggested' || r.status === 'Review required',
        isAccepted: !!(o.accepted && o.accepted[r.id]),
        canExclude: r.status !== 'Excluded' && r.status !== 'Missing target',
        onOpen: o.onOpen ? () => o.onOpen(r.id) : () => {},
        onAccept: o.onAccept ? () => o.onAccept(r.id) : () => {},
        onExclude: o.onExclude ? () => o.onExclude(r.id) : () => {},
      };
    });
  }

  /** Summary cards. Counts computed from the pack — never literal. */
  buildMappingCards(rows, activeId) {
    const m = (this.entity && this.entity.mapping) || {};
    return (m.cards || []).map((c) => {
      const n = rows.filter((r) => (c.statuses || []).indexOf(r.status) >= 0).length;
      return {
        id: c.id,
        label: c.label,
        value: fmt(n),
        impact: c.impact || 'na',
        active: activeId === c.id,
        statuses: c.statuses || [],
      };
    });
  }


  /* ============================================================ CSV + upload
     Step 1 only. At that point NO profile exists, so none of this may read
     entity.fields — it works purely off the parsed CSV plus entity.spec.
     ---------------------------------------------------------------------- */

  /** Minimal RFC-ish CSV parse: handles quoted fields containing commas. */
  parseCSV(text) {
    return text.split(/\r?\n/).filter((l) => l.trim().length).map((line) => {
      const cells = [];
      let cur = '', q = false;
      for (const ch of line) {
        if (ch === '"') q = !q;
        else if (ch === ',' && !q) { cells.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      cells.push(cur.trim());
      return cells;
    });
  }

  /** Match a header by name, ignoring case and punctuation. */
  static colIndex(header, name) {
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const want = norm(name);
    return header.findIndex((h) => norm(h) === want);
  }

  /* Stat cards were removed from the Upload page in the final design, so
     buildUploadStats() and entity.spec.uploadStats were deleted with it. If
     measured counts are wanted on step 1 again, add them to the pack rather
     than hardcoding them here. */

  /* =============================================================== drawer
     A tab renders only when the field carries the data it needs, so a sparse
     Customers field shows fewer tabs than a rich Items field automatically.
     -------------------------------------------------------------------- */
  drawerTabsFor(field) {
    const need = {
      evidence: null, samples: 'sample', distribution: 'dist', duplicates: 'duplicates',
      patterns: 'patterns', invalid: 'invalidTable', interpretation: 'interpretation'
    };
    const label = {
      evidence: 'Evidence', samples: 'Sample values', distribution: 'Distribution',
      duplicates: 'Duplicates', patterns: 'Patterns', invalid: 'Invalid values',
      interpretation: 'AI interpretation'
    };
    return Object.keys(need)
      .filter((id) => need[id] === null || (field && field[need[id]]))
      .map((id) => ({ id, label: label[id] }));
  }


  /* =========================================================== shellVals()
     Spread this into every page's renderVals(). Supplies exactly the bindings
     dp-shell / dp-steps / dp-copilot declare and nothing else.
     -------------------------------------------------------------------- */
  shellVals() {
    const s   = this.state;
    const p   = this.project;
    const e   = this.entity || {};
    const t   = this.target();
    const cur = this.stepNumber();
    const exp = !!s.railExpanded;

    return {
      /* --- theme + density ------------------------------------------- */
      theme: s.theme || 'light',
      density: s.density || 'comfortable',
      isDark:  s.theme === 'dark',
      isLight: s.theme !== 'dark',
      toggleTheme: this.toggleTheme,

      /* --- org / user ------------------------------------------------ */
      orgName: p.orgName,
      orgInitials: p.orgName.charAt(0).toUpperCase(),
      userName: p.user.name,
      userRole: p.user.role,
      userInitials: p.user.name.charAt(0).toUpperCase(),
      memberCount: String(p.memberCount),

      /* --- nav rail (expand / collapse) ------------------------------ */
      railExpanded: exp,
      railCollapsed: !exp,
      railToggleTip: exp ? 'Collapse' : 'Expand',
      toggleRail: this.toggleRail,
      railStyle: 'width:' + (exp ? 240 : 64) + 'px;flex-shrink:0;border-right:1px solid var(--border);'
        + 'background:var(--card);display:flex;flex-direction:column;padding:20px ' + (exp ? 12 : 8) + 'px 16px;'
        + 'transition:width 200ms ease;' + (exp ? '' : 'align-items:center;'),
      railTopStyle: 'display:flex;align-items:center;gap:10px;margin-bottom:16px;'
        + (exp ? 'width:100%;' : 'justify-content:center;'),
      railItemsStyle: 'flex:1;display:flex;flex-direction:column;gap:2px;'
        + (exp ? 'width:100%;' : 'align-items:center;'),
      railItems: [
        { id: 'projects',  label: 'Projects' },
        { id: 'migration', label: 'Migration' },
        { id: 'settings',  label: 'Settings' }
      ].map((it) => {
        const active = it.id === 'migration';
        return {
          label: it.label,
          isProjects:  it.id === 'projects',
          isMigration: it.id === 'migration',
          isSettings:  it.id === 'settings',
          style: 'display:flex;align-items:center;border-radius:8px;padding:10px ' + (exp ? '12px' : '8px') + ';cursor:pointer;'
            + (exp ? 'width:100%;' : 'justify-content:center;')
            + (active ? 'background:var(--primary);color:var(--primary-fg);' : 'background:transparent;color:var(--muted);'),
          labelStyle: 'margin-left:12px;font-size:14px;font-weight:500;white-space:nowrap;color:'
            + (active ? 'var(--primary-fg)' : 'var(--muted)') + ';'
        };
      }),

      /* --- project sidebar ------------------------------------------- */
      sidebarOpen: s.sidebarOpen !== false,
      sidebarClosed: s.sidebarOpen === false,
      toggleSidebar: this.toggleSidebar,
      membersOpen: s.membersOpen !== false,
      toggleMembers: this.toggleMembers,
      membersCaretStyle: 'font-size:11px;display:block;transition:transform .16s ease;transform:rotate('
        + (s.membersOpen !== false ? '0deg' : '-90deg') + ');',

      projectName: p.name,
      projectId: p.id,
      createdAt: p.createdAt,
      lastEdited: p.lastEdited,

      /* --- migration source -> target -------------------------------- */
      sourceSystemName: (e.source && e.source.system) || '—',
      sourceInitials: (((e.source && e.source.system) || '?').charAt(0)).toUpperCase(),
      sourceBadgeStyle: this.badgeStyle(22, DP_SOURCE_COLOR),
      sourceRowsLabel: e.source && e.source.rowCount ? fmt(e.source.rowCount) + ' source rows' : '— source rows',
      targetName: t.name,
      targetInitials: t.initials,
      targetBadgeStyle: this.badgeStyle(22),
      targetRowsLabel: e.source && e.source.rowCount ? fmt(e.source.rowCount) + ' target rows' : '— target rows',

      /* --- step rail -------------------------------------------------
         Uses the canonical 8-step list. A page supplies only stepId.
         --------------------------------------------------------------- */
      steps: DP_TAX.steps.map((st, i) => ({
        n: st.n,
        label: st.short,
        isDone:   st.n <  cur,
        isActive: st.n === cur,
        isTodo:   st.n >  cur,
        notLast: i < DP_TAX.steps.length - 1,
        itemStyle: 'display:flex;align-items:center;flex:0 0 auto;',
        labelStyle: 'font-size:12px;white-space:nowrap;line-height:1.2;'
          + (st.n === cur ? 'font-weight:700;color:var(--fg);' : 'font-weight:600;color:var(--fg);'),
        lineStyle: 'flex:0 0 auto;width:14px;height:1.5px;margin:0 7px;background:'
          + (st.n < cur ? 'var(--primary)' : 'var(--border)') + ';'
      })),

      /* --- page heading ---------------------------------------------
         Derived from the entity pack + step, so the title is correct for
         Customers with no page edit.
         --------------------------------------------------------------- */
      pageTitle: this.step().label,
      stepCounter: 'Step ' + cur + ' of ' + DP_TAX.steps.length,
      entityLabel: e.label ? e.label.plural : '',
      fileLine: e.source && e.source.rowCount
        ? ((e.source.object || 'source extract') + ' · ' + fmt(e.source.rowCount) + ' rows')
        : 'No source file selected',

      /* --- Copilot ---------------------------------------------------
         copilotClosed is true when the step has no Copilot at all, which
         is how step 1 renders without one.
         --------------------------------------------------------------- */
      copilotOpen: this.hasCopilot() && s.copilotOpen !== false,
      copilotClosed: this.hasCopilot() && s.copilotOpen === false,
      toggleCopilot: this.toggleCopilot,

      /* chat, prompts and the feedback loop — only when the step has a Copilot,
         so step 1 does not carry values it can never render */
      ...(this.hasCopilot() ? this.copilotVals() : {})
    };
  }
}
