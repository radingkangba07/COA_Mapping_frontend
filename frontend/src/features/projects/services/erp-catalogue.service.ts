import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';

// ─── Response Types ──────────────────────────────────────────────────────────

export interface CatalogueConnectionMethod {
  readonly id: string;
  readonly name: string;
  readonly requires_mcp_config: boolean;
}

export interface CatalogueProduct {
  readonly id: string;
  readonly product_name: string;
  readonly connection_methods: readonly CatalogueConnectionMethod[];
}

export interface CatalogueVendor {
  readonly vendor: string;
  readonly products: readonly CatalogueProduct[];
}

// ─── API Calls ───────────────────────────────────────────────────────────────

export async function getCatalogueVendors(
  client: HttpClient,
): Promise<Result<CatalogueVendor[], AppError>> {
  try {
    const { data } = await client.get<CatalogueVendor[]>(
      '/api/v1/erp-systems/catalogue/vendors',
    );
    return ok(data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
