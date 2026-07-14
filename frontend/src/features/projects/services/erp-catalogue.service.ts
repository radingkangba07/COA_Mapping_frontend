import type { HttpClient } from '@/shared/services/http/http.types';
import type { Result, AppError } from '@/shared/types/result.types';
import { ok, err } from '@/shared/types/result.types';
import { toAppError } from '@/shared/services/http/http.client';

// ─── Response Types ──────────────────────────────────────────────────────────

export interface CatalogueVendor {
  readonly vendor: string;
}

export interface CatalogueProduct {
  readonly id: string;
  readonly vendor: string;
  readonly product_name: string;
  readonly connection_methods: readonly string[];
}

export interface CatalogueConnectionMethod {
  readonly id: string;
  readonly name: string;
  readonly requires_mcp_config: boolean;
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

export async function getCatalogueProducts(
  client: HttpClient,
  vendor: string,
): Promise<Result<CatalogueProduct[], AppError>> {
  try {
    const { data } = await client.get<CatalogueProduct[]>(
      `/api/v1/erp-systems/catalogue/vendors/${encodeURIComponent(vendor)}/products`,
    );
    return ok(data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}

export async function getCatalogueConnectionMethods(
  client: HttpClient,
  productId: string,
): Promise<Result<CatalogueConnectionMethod[], AppError>> {
  try {
    const { data } = await client.get<CatalogueConnectionMethod[]>(
      `/api/v1/erp-systems/catalogue/products/${encodeURIComponent(productId)}/connection-methods`,
    );
    return ok(data);
  } catch (error: unknown) {
    return err(toAppError(error));
  }
}
