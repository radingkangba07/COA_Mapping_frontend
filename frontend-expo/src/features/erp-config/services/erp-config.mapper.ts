import { z } from 'zod';
import type {
  ERPSystem,
  ERPField,
  ERPSampleData,
  FuzzyMatch,
  FuzzyMatchResult,
} from '../types/erp-config.types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const erpFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['string', 'number']),
  required: z.boolean(),
});

export const erpSystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  fields: z.array(erpFieldSchema),
});

export const erpSystemListSchema = z.array(erpSystemSchema);

export const accountTypesResponseSchema = z.object({
  account_types: z.array(z.string()),
});

export const sampleDataResponseSchema = z.object({
  erp_id: z.string().min(1),
  erp_name: z.string().min(1),
  data: z.array(z.record(z.string(), z.unknown())),
  row_count: z.number(),
});

export const fuzzyMatchSchema = z.object({
  source_column: z.string(),
  target_field: z.string(),
  score: z.number(),
});

export const fuzzyMatchResultSchema = z.object({
  mappings: z.array(fuzzyMatchSchema),
  target_fields: z.array(z.string()),
});

// ─── DTO Types ───────────────────────────────────────────────────────────────

export type ERPSystemDTO = z.infer<typeof erpSystemSchema>;
export type SampleDataDTO = z.infer<typeof sampleDataResponseSchema>;
export type FuzzyMatchDTO = z.infer<typeof fuzzyMatchSchema>;
export type FuzzyMatchResultDTO = z.infer<typeof fuzzyMatchResultSchema>;

// ─── Mappers ────────────────────────────────────────────────────────────────

export function toERPField(dto: z.infer<typeof erpFieldSchema>): ERPField {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    required: dto.required,
  };
}

export function toERPSystem(dto: ERPSystemDTO): ERPSystem {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    fields: dto.fields.map(toERPField),
  };
}

export function toSampleData(dto: SampleDataDTO): ERPSampleData {
  return {
    erpId: dto.erp_id,
    erpName: dto.erp_name,
    data: dto.data,
    rowCount: dto.row_count,
  };
}

export function toFuzzyMatch(dto: FuzzyMatchDTO): FuzzyMatch {
  return {
    sourceColumn: dto.source_column,
    targetField: dto.target_field,
    score: dto.score,
  };
}

export function toFuzzyMatchResult(dto: FuzzyMatchResultDTO): FuzzyMatchResult {
  return {
    mappings: dto.mappings.map(toFuzzyMatch),
    targetFields: dto.target_fields,
  };
}
