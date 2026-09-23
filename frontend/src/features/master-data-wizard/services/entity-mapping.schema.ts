import { z } from 'zod';

/* ============================================================================
   entity-mapping.schema.ts  ·  Field Mapping (step 3) zod schema
   ----------------------------------------------------------------------------
   Mirrors dp-kit/types/entity.d.ts's EntityMapping — split out of
   entity-pack.service.ts (which was already past the 200-line file
   guideline before this) rather than growing that file further.

   `status`/`validation`/`handoff` are keys into dp-taxonomies.json's
   mappingStatus/mappingValidation/mappingHandoff (plain strings there too,
   not a closed union), so validated as z.string() rather than z.enum, same
   looseness as entity.d.ts itself. Every optional field here is `.nullable()`
   as well as `.optional()` — confirmed against both fixtures that an
   unresolved AI field (no proposed target, no confidence yet, no handoff
   step) is authored as an explicit `null`, not an omitted key.
   ========================================================================= */

const targetFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  dtype: z.string().nullable().optional(),
  required: z.boolean().nullable().optional(),
  identifier: z.boolean().nullable().optional(),
  writable: z.boolean().nullable().optional(),
});

const mappingProposalSchema = z.object({
  id: z.string(),
  name: z.string(),
  sdtype: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  samples: z.array(z.string()).nullable().optional(),
  targetId: z.string().nullable().optional(),
  conf: z.number().nullable().optional(),
  status: z.string(),
  validation: z.string().nullable().optional(),
  evidence: z.array(z.string()).nullable().optional(),
  handoff: z.string().nullable().optional(),
  why: z.string().nullable().optional(),
});

// Same row shape as mappingProposalSchema — targetId is required (a missing
// target is defined by needing one) and name is optional (no source column
// necessarily supplies it). Restated rather than derived so each schema's
// required/optional fields stay independently readable, matching entity.d.ts's
// own choice to restate this shape instead of referencing MappingProposal.
const missingTargetSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  sdtype: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  samples: z.array(z.string()).nullable().optional(),
  targetId: z.string(),
  conf: z.number().nullable().optional(),
  status: z.string(),
  validation: z.string().nullable().optional(),
  evidence: z.array(z.string()).nullable().optional(),
  handoff: z.string().nullable().optional(),
  why: z.string().nullable().optional(),
});

const mappingCardSchema = z.object({
  id: z.enum(['high', 'review', 'none', 'missing', 'excluded']),
  label: z.string(),
  impact: z.string().nullable().optional(),
  statuses: z.array(z.string()).nullable().optional(),
});

const mappingReadinessSchema = z.object({
  headline: z.string().nullable().optional(),
  tone: z.enum(['blocker', 'warn', 'neutral']).nullable().optional(),
  narrative: z.string().nullable().optional(),
  recommendedOrder: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
  evidence: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
});

export const entityMappingSchema = z.object({
  targetFields: z.array(targetFieldSchema).optional(),
  proposals: z.array(mappingProposalSchema).optional(),
  missingTargets: z.array(missingTargetSchema).optional(),
  cards: z.array(mappingCardSchema).optional(),
  autoAcceptAt: z.number().optional(),
  pageSize: z.number().optional(),
  readiness: mappingReadinessSchema.optional(),
});
