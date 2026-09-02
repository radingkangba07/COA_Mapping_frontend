 /* ============================================================================
   entity-pack.types.ts  ·  EntityPack + sub-DTOs, re-exported from dp-kit
   ----------------------------------------------------------------------------
   dp-kit/types/entity.d.ts is generated and read-only (see its own header
   comment). This file is the single place the rest of the wizard imports pack
   shapes from, so nothing outside dp-kit/ hand-authors an EntityPack — see
   root CLAUDE.md, "master-data wizard (dp-kit) rules".

   EntityPack below extends dp-kit's generated pack with `spec`, the
   pre-upload half of the pack Step 1 needs. `spec` genuinely IS part of the
   vendored contract (dp-kit/config/entity.schema.json defines it), but
   dp-kit/types/entity.d.ts's generated EntityPack is stale and omits it —
   that file claims to be "GENERATED from config/entity.schema.json" yet
   disagrees with it here. Declared again below until the generated type is
   regenerated/fixed upstream. Every other shape here is re-exported as-is —
   do not hand-duplicate any of them elsewhere; a second, independently-
   maintained copy is exactly how this contract previously drifted out of
   sync with what entity-pack.service.ts's zod schema already validated
   (metrics, readiness, mapping, and every EntityField profiling field were
   being parsed and then hidden from callers by an incomplete TS type).

   API:  GET /api/v1/projects/:orgProjectId/entities/:entityId/profile  ->  EntityPack
   ========================================================================= */

export type {
  Impact,
  FindTone,
  MetricTone,
  Provenance,
  StepId,
  ProfileFilterId,
  SemanticRole,
  EntityId,
  EntityField,
  EntityMetric,
  EntityReadiness,
  EntityRules,
  EntityIdentity,
  TargetField,
  MappingProposal,
  MissingTarget,
  MappingCard,
  EntityMapping,
  ProjectContext,
} from '../dp-kit/types/entity';

import type { EntityPack as DpKitEntityPack } from '../dp-kit/types/entity';

/** A complete entity pack — dp-kit's generated pack plus `spec` (see header). */
export interface EntityPack extends DpKitEntityPack {
  /**
   * Pre-upload half of the pack. Step 1 reads only this — never `fields`,
   * which is empty at that point.
   */
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
