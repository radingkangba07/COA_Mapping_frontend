import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';
import type {
  ERPSystem,
  ERPSampleData,
  FuzzyMatchResult,
} from '../types/erp-config.types';
import {
  erpSystemListSchema,
  erpSystemSchema,
  accountTypesResponseSchema,
  sampleDataResponseSchema,
  fuzzyMatchResultSchema,
  toERPSystem,
  toSampleData,
  toFuzzyMatchResult,
} from './erp-config.mapper';

// ─── Service Functions ──────────────────────────────────────────────────────

export async function getERPSystems(
  client: HttpClient,
): Promise<Result<ERPSystem[], AppError>> {
  try {
    const { data } = await client.get<unknown>('/api/v1/erp-systems');

    const parsed = erpSystemListSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'ERP systems response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.map(toERPSystem));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getERPSystem(
  client: HttpClient,
  id: string,
): Promise<Result<ERPSystem, AppError>> {
  try {
    const { data } = await client.get<unknown>(`/api/v1/erp-systems/${id}`);

    const parsed = erpSystemSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'ERP system response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toERPSystem(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getAccountTypes(
  client: HttpClient,
  targetErp: string,
): Promise<Result<string[], AppError>> {
  try {
    const { data } = await client.get<unknown>(
      `/api/v1/erp-systems/account-types/${targetErp}`,
    );

    const parsed = accountTypesResponseSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Account types response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(parsed.data.account_types);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getSampleData(
  client: HttpClient,
  erpId: string,
): Promise<Result<ERPSampleData, AppError>> {
  try {
    const { data } = await client.get<unknown>(
      `/api/v1/erp-systems/sample-data/${erpId}`,
    );

    const parsed = sampleDataResponseSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Sample data response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toSampleData(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function downloadSampleData(
  client: HttpClient,
  erpId: string,
): Promise<Result<Blob, AppError>> {
  try {
    const { data } = await client.get<Blob>(
      `/api/v1/erp-systems/sample-data/${erpId}/download`,
      { responseType: 'blob' },
    );
    return ok(data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function fuzzyMatchColumns(
  client: HttpClient,
  sourceColumns: string[],
  targetErp: string,
  threshold?: number,
): Promise<Result<FuzzyMatchResult, AppError>> {
  try {
    const payload: { source_columns: string[]; target_erp: string; threshold?: number } = {
      source_columns: sourceColumns,
      target_erp: targetErp,
    };
    if (threshold !== undefined) {
      payload.threshold = threshold;
    }

    const { data } = await client.post<unknown>(
      '/api/v1/erp-systems/fuzzy-match',
      payload,
    );

    const parsed = fuzzyMatchResultSchema.safeParse(data);
    if (!parsed.success) {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Fuzzy match response failed validation',
        details: { issues: parsed.error.issues },
      });
    }

    return ok(toFuzzyMatchResult(parsed.data));
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
