/* ============================================================================
   entity.d.ts  ·  GENERATED from config/entity.schema.json — do not hand-edit
   ----------------------------------------------------------------------------
   Regenerate:  python3 build/gen_types.py

   This is the CONTRACT between the migration backend and the frontend. The
   backend serves an EntityPack per object per project; the frontend renders it.
   The frontend should never hand-author a pack.

       GET /api/projects/:projectId/entities/:entityId/profile  ->  EntityPack

   Because the pack fully determines the page, adding Vendors or Fixed Assets is
   a backend/config task, not a frontend task.
   ========================================================================= */

/** Migration severity, ranked. Drives colour via [data-impact] and sort order. */
export type Impact = "blocker" | "review" | "warning" | "resolved" | "clean" | "na";

/** Finding chip tone. Drives colour via [data-find]. */
export type FindTone = 'dup' | 'warn' | 'info' | 'ok';

/** Metric numeral tone. Drives colour via [data-metrictone]. */
export type MetricTone = "blocker" | "warn" | "neutral" | "ok" | "info" | "muted";

/**
 * PROVENANCE. The governance primitive — drives colour via [data-prov].
 *   fact   deterministic profiling output; must be reproducible by the profiler
 *   ai     model inference; MUST pass through the approval modal before it writes
 *   action a control the user can invoke
 */
export type Provenance = 'fact' | 'ai' | 'action';

/** The 8 wizard steps. */
export type StepId = "upload" | "profile" | "mapping" | "values" | "formats" | "validation" | "test" | "import";

/** Visual filter ids. Must match values used in EntityField.categories. */
export type ProfileFilterId = "all"
  | "blockers"
  | "identifiers"
  | "duplicates"
  | "missing"
  | "invalid"
  | "nearEmpty"
  | "outliers"
  | "enums"
  | "refFailures"
  | "patterns";

/** Inferred role a field plays in the migration. */
export type SemanticRole = "Identifier candidate" | "Display name" | "Value list" | "Measure" | "Reference" | "Date" | "Flag" | "Free text" | "Audit metadata";

/**
 * Master-data objects served by this wizard. COA is deliberately absent:
 * the Chart of Accounts flow is already built and running and must not be
 * routed through these pages. Generated from entity.schema.json.
 */
export type EntityId = "customers" | "vendors" | "items" | "locations" | "contacts" | "vehicles" | "equipment" | "fixedAssets";


/** One profiled source field. MIXED PROVENANCE — see per-field notes. */
export interface EntityField {
    id: string;
    /** Source column header as it appears in the CSV. */
    name: string;
    /** What the field means in business terms. */
    semantic?: string;
    /** semanticRoles id or label from dp-taxonomies.json. */
    role?: string;
    roleTip?: string;
    datatype: "Text" | "Integer" | "Decimal" | "Date" | "DateTime" | "Boolean";
    /** fact */
    nullCount?: number;
    /** fact */
    distinct?: number;
    /** fact — percent */
    uniqueness?: number;
    /** fact — High/Medium/Low/Constant */
    cardinality?: string;
    /** ai — model confidence in the inferred role, 0-100 */
    confidence?: number;
    /** fact — derived from the stats by rule */
    impact: "blocker" | "review" | "warning" | "clean" | "na" | "resolved";
    /** authored — must explain the migration consequence, not restate the number */
    impactReason?: string;
    /** fact — profileFilters ids this field appears under */
    categories?: string[];
    /** fact */
    sample?: string[];
    /** fact */
    findings?: {
      t: string;
      tone: "dup" | "warn" | "info" | "ok";
    }[];
    /** fact — present only if duplicates were found */
    duplicates?: {
      rows?: number;
      groups?: number;
      crossSub?: number;
      crossPct?: number;
      composite?: string;
    };
    /** fact */
    patterns?: {
      label?: string;
      pct?: number;
    }[];
    /** fact */
    patternAnomalies?: number;
    /** fact — text fields only */
    text?: {
      minLen?: number;
      maxLen?: number;
      avgLen?: number;
    };
    /** fact — numeric fields only. Values are pre-formatted strings so the page never formats numbers. */
    range?: {
      min?: string;
      max?: string;
      median?: string;
      p95?: string;
      outliers?: number;
      /** Outlier method must be disclosed — it is fact, so it must be reproducible. */
      method?: string;
      examples?: string;
    };
    /** fact — date fields only */
    dateProfile?: {
      earliest?: string;
      latest?: string;
      invalid?: number;
      future?: number;
    };
    /** fact + recommendation. Populated below rules.nearEmptyPct. */
    nearEmpty?: {
      populated?: number;
      populatedPct?: number;
      requiredByTarget?: string;
      /** ai */
      recommendation?: string;
      /** ai */
      safeToExclude?: string;
    };
    /** fact */
    enumeration?: {
      candidate?: string;
      validRef?: number;
      invalidSrc?: number;
      affectedRows?: number;
      aliasRows?: number;
      unresolved?: number;
      refIntegrity?: string;
      categoryAvailable?: number;
      highConf?: number;
      ambiguous?: number;
      insufficient?: number;
    };
    /** fact */
    dist?: {
      label?: string;
      pct?: number;
    }[];
    distTitle?: string;
    /** fact */
    invalidTable?: {
      src?: string;
      occ?: number;
      canon?: string;
      status?: string;
      tone?: "dup" | "warn" | "info" | "ok";
    }[];
    /** ai — rendered under data-prov=ai. Must state that nothing is applied without approval. */
    interpretation?: string;
    /** ai — why the role was inferred and what it maps to. */
    reasoning?: string;
    /** action */
    actions?: {
      id: string;
      label: string;
      primary?: boolean;
    }[];
    /** Values shown in the field-comparison tray. */
    compare?: {
      cardinality?: string;
      sem?: string;
      overlap?: string;
    };
  }

/** One entry in the metric bar. Values are COMPUTED, never literal. */
export interface EntityMetric {
    /** Stable key; drives the active state and the highlight. */
    id: string;
    label: string;
    /** rowCount=source.rowCount · fieldCount=fields.length · impactCount=fields with impact · sumNulls=total blanks · reviewCount=fields still needing review (live, from state) · fieldStat=read a dotted path off one field */
    kind: "rowCount" | "fieldCount" | "impactCount" | "sumNulls" | "reviewCount" | "fieldStat";
    /** For kind=impactCount. */
    impact?: string;
    /** For kind=fieldStat: which field id to read. */
    field?: string;
    /** For kind=fieldStat: dotted path, e.g. 'duplicates.rows' or 'enumeration.affectedRows'. */
    path?: string;
    tone?: "blocker" | "warn" | "neutral";
    /** Field ids to highlight in the table when this metric is clicked. */
    highlight?: string[];
    /** profileFilters id activated when clicked. */
    filter?: string;
    tip?: string;
  }

/** Readiness banner. narrative + recommendedOrder are ai; evidence is fact. */
export interface EntityReadiness {
    headline?: string;
    tone?: "blocker" | "warn" | "neutral";
    /** PROVENANCE: ai. Authored or model-generated. */
    narrative?: string;
    /** PROVENANCE: ai. Ordered remediation steps. */
    recommendedOrder?: {
      label: string;
      target?: string;
    }[];
    /** PROVENANCE: fact. Every entry must be reproducible by the profiler. */
    evidence?: {
      value: string;
      label: string;
    }[];
  }

/** Validation + normalisation thresholds. */
export interface EntityRules {
    requiredTargets?: string[];
    requiredReferenceFields?: string[];
    optionalReferenceFields?: string[];
    /** Treated as blank during profiling. */
    nullTokens?: string[];
    /** Confidence at or above which a match may be bulk-confirmed. */
    confirmThreshold?: number;
    /** Populated below this % counts as near-empty. */
    nearEmptyPct?: number;
    maxLength?: {
      char?: number;
      text?: number;
    };
    /** Keyed by target field id. Each entry lists canonical values and their accepted aliases. */
    allowedValues?: Record<string, {
      value: string;
      aliases?: string[];
    }[]>;
  }

/** How a record is uniquely keyed on import. */
export interface EntityIdentity {
    /** Field ids that could serve as the import key, best first. NEVER auto-confirmed — the user approves on the profile page. */
    candidates: string[];
    /** Set only by explicit user approval. */
    confirmed?: string;
    /** Fallbacks when no single field is unique, e.g. [['sku','subsidiary']]. */
    compositeCandidates?: string[][];
  }

/** A writable field in the target ERP. Populates the target dropdown. */
export interface TargetField {
    id: string;
    label: string;
    dtype?: string;
    required?: boolean;
    identifier?: boolean;
    writable?: boolean;
  }

/** One AI-proposed source -> target mapping. Provenance: ai. */
export interface MappingProposal {
    id: string;
    /** Source column header. */
    name: string;
    /** Source datatype. */
    sdtype?: string;
    /** Inferred role — ai. */
    role?: string;
    /** fact */
    samples?: string[];
    /** Proposed target field id — ai. */
    targetId?: string;
    /** ai — 0-100 confidence in the proposal. */
    conf?: number;
    /** Key in dp-taxonomies.json mappingStatus.states. */
    status: string;
    /** Key in mappingValidation.states. fact. */
    validation?: string;
    /** Codes from mappingEvidence.labels. */
    evidence?: string[];
    /** Key in mappingHandoff.states. */
    handoff?: string;
    /** ai — why this target was proposed. Shown in the detail panel. */
    why?: string;
  }

/** A required target no source column supplies. Provenance: fact. */
export interface MissingTarget {
    id: string;
    /** Source column header. */
    name?: string;
    /** Source datatype. */
    sdtype?: string;
    /** Inferred role — ai. */
    role?: string;
    /** fact */
    samples?: string[];
    /** Proposed target field id — ai. */
    targetId: string;
    /** ai — 0-100 confidence in the proposal. */
    conf?: number;
    /** Key in dp-taxonomies.json mappingStatus.states. */
    status: string;
    /** Key in mappingValidation.states. fact. */
    validation?: string;
    /** Codes from mappingEvidence.labels. */
    evidence?: string[];
    /** Key in mappingHandoff.states. */
    handoff?: string;
    /** ai — why this target was proposed. Shown in the detail panel. */
    why?: string;
  }

/** One summary card above the mapping table. Counts are COMPUTED. */
export interface MappingCard {
    id: "high" | "review" | "none" | "missing" | "excluded";
    label: string;
    /** Semantic tone; falls back to a sensible default per id. */
    impact?: string;
    /** Which mappingStatus values this card counts. */
    statuses?: string[];
  }

/** Field Mapping (step 3). */
export interface EntityMapping {
    /** The target ERP's writable field catalogue for this record. Populates the target dropdown on every row. */
    targetFields?: {
      id: string;
      label: string;
      dtype?: string;
      required?: boolean;
      identifier?: boolean;
      writable?: boolean;
    }[];
    /** One row per source field. confidence and why are PROVENANCE ai; validation and evidence are fact. Nothing here is applied until the user accepts it. */
    proposals?: {
      id: string;
      /** Source column header. */
      name: string;
      /** Source datatype. */
      sdtype?: string;
      /** Inferred role — ai. */
      role?: string;
      /** fact */
      samples?: string[];
      /** Proposed target field id — ai. */
      targetId?: string;
      /** ai — 0-100 confidence in the proposal. */
      conf?: number;
      /** Key in dp-taxonomies.json mappingStatus.states. */
      status: string;
      /** Key in mappingValidation.states. fact. */
      validation?: string;
      /** Codes from mappingEvidence.labels. */
      evidence?: string[];
      /** Key in mappingHandoff.states. */
      handoff?: string;
      /** ai — why this target was proposed. Shown in the detail panel. */
      why?: string;
    }[];
    /** Required target fields with no source field supplying them. SAME ROW SHAPE as proposals so the table renders them without a special case — the shape is restated here rather than left as a bare object, because a loose node produced an untyped MissingTarget in entity.d.ts. */
    missingTargets?: {
      id: string;
      /** Source column header. */
      name?: string;
      /** Source datatype. */
      sdtype?: string;
      /** Inferred role — ai. */
      role?: string;
      /** fact */
      samples?: string[];
      /** Proposed target field id — ai. */
      targetId: string;
      /** ai — 0-100 confidence in the proposal. */
      conf?: number;
      /** Key in dp-taxonomies.json mappingStatus.states. */
      status: string;
      /** Key in mappingValidation.states. fact. */
      validation?: string;
      /** Codes from mappingEvidence.labels. */
      evidence?: string[];
      /** Key in mappingHandoff.states. */
      handoff?: string;
      /** ai — why this target was proposed. Shown in the detail panel. */
      why?: string;
    }[];
    /** Summary cards above the table. Counts are COMPUTED by DPBase.buildMappingCards() from proposals — never literal. */
    cards?: {
      id: "high" | "review" | "none" | "missing" | "excluded";
      label: string;
      /** Semantic tone; falls back to a sensible default per id. */
      impact?: string;
      /** Which mappingStatus values this card counts. */
      statuses?: string[];
    }[];
    /** Confidence at or above which a proposal is treated as high-confidence. Below it, a human confirms. */
    autoAcceptAt?: number;
    pageSize?: number;
    /** Step-3 readiness banner. Distinct from the top-level readiness, which is about DATA QUALITY; this is about MAPPING COVERAGE. */
    readiness?: {
      headline?: string;
      tone?: "blocker" | "warn" | "neutral";
      /** ai */
      narrative?: string;
      /** ai */
      recommendedOrder?: Record<string, unknown>[];
      /** fact */
      evidence?: Record<string, unknown>[];
    };
  }

/* ----------------------------------------------------------------------------
   MANUAL TARGET OVERRIDE
   A user may reject a proposal and pick the target themselves. Keep these
   separate from the pack: the pack is what the profiler produced, overrides are
   what a human decided. Persist them, never fold them back into `proposals`.

   Every entry here MUST have been confirmed through the approval modal. A row
   carrying an override renders as [data-prov="action"], not "ai" — the model no
   longer owns that decision.
   ------------------------------------------------------------------------- */

/** fieldId -> targetField id. '' means deliberately unmapped. */
export type MappingOverrides = Record<string, string>;

export interface RetargetRequest {
  /** EntityField.id being remapped. */
  fieldId: string;
  /** New TargetField.id, or '' to unset. */
  targetId: string;
  /** What the profiler had proposed, kept for audit. */
  previousTargetId: string;
}

/** A complete entity pack — everything one object needs across all 8 steps. */
export interface EntityPack {
  id: EntityId;
  label: { singular: string; plural: string; recordWord?: string };
  source: { system?: string; object: string; rowCount?: number };
  target: { record: string; schemaVersion?: string; recordsetVersion?: string };
  identity: EntityIdentity;
  rules?: EntityRules;
  metrics?: EntityMetric[];
  readiness?: EntityReadiness;
  mapping?: EntityMapping;
  fields: EntityField[];
  copilotPrompts?: string[];
  copilotResponses?: Record<string, { text: string; fixes?: string[] }>;
  copilotFixes?: Record<string, {
    issue: string; affected: number; action: string;
    evidence: string; impact: string; auto: boolean; field?: string;
  }>;
  sampleCsv?: string | null;
}

/** Project-level context. Per project, NOT per entity. */
export interface ProjectContext {
  orgName: string;
  name: string;
  id: string;
  createdAt: string;
  lastEdited: string;
  targetSystem: 'odoo' | 'netsuite' | 'qbo' | 'xero' | 'intacct' | 'd365' | 'acumatica';
  user: { name: string; role: string };
  memberCount: number;
}
