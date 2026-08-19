/* ============================================================================
   entity.ts  ·  EntityPack contract for the master-data wizard
   ----------------------------------------------------------------------------
   Based on docs/handover/app/types/entity.d.ts with `spec` added.
   `spec` covers the pre-upload half of the pack (expected columns, sample CSV,
   target note). Steps 2-8 use `fields`, `readiness`, `metrics`, and `mapping`.
   Step 1 must never read `fields` — at that point there is nothing there.

   API:  GET /api/projects/:projectId/entities/:entityId/profile  →  EntityPack
   ========================================================================= */

export type Impact = 'blocker' | 'review' | 'warning' | 'resolved' | 'clean' | 'na';
export type FindTone = 'dup' | 'warn' | 'info' | 'ok';
export type MetricTone = 'blocker' | 'warn' | 'neutral' | 'ok' | 'info' | 'muted';
export type Provenance = 'fact' | 'ai' | 'action';
export type StepId = 'upload' | 'profile' | 'mapping' | 'values' | 'formats' | 'validation' | 'test' | 'import';

export type EntityId =
  | 'customers'
  | 'vendors'
  | 'items'
  | 'locations'
  | 'contacts'
  | 'vehicles'
  | 'equipment'
  | 'fixedAssets';

export interface EntityField {
  id: string;
  name: string;
  semantic?: string;
  role?: string;
  roleTip?: string;
  datatype: 'Text' | 'Integer' | 'Decimal' | 'Date' | 'DateTime' | 'Boolean';
  nullCount?: number;
  distinct?: number;
  uniqueness?: number;
  cardinality?: string;
  confidence?: number;
  impact: Impact;
  impactReason?: string;
  categories?: string[];
  sample?: string[];
  findings?: { t: string; tone: FindTone }[];
}

export interface EntityRules {
  requiredTargets?: string[];
  requiredReferenceFields?: string[];
  optionalReferenceFields?: string[];
  nullTokens?: string[];
  confirmThreshold?: number;
  nearEmptyPct?: number;
}

export interface EntityIdentity {
  candidates: string[];
  confirmed?: string;
  compositeCandidates?: string[][];
}

export interface EntityPack {
  id: EntityId;
  label: { singular: string; plural: string; recordWord?: string };
  source: { system?: string; object: string; rowCount?: number };
  target: { record: string; schemaVersion?: string; recordsetVersion?: string };
  identity: EntityIdentity;
  rules?: EntityRules;
  fields: EntityField[];
  sampleCsv?: string | null;
  /** Pre-upload half of the pack. Step 1 reads only this. */
  spec?: {
    expectedColumns?: string[];
    sample?: {
      name?: string;
      description?: string;
      content?: string;
    };
    targetNote?: string;
  };
}

export type MappingOverrides = Record<string, string>;
