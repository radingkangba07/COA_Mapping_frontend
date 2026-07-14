import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import {
  getCatalogueVendors,
  getCatalogueProducts,
} from '../services/erp-catalogue.service';
import type { CatalogueProduct } from '../services/erp-catalogue.service';
import type { ConnectionMethod } from '../types/project-scope.types';
import type { SelectOption } from '@/shared/components/ui/Select';

// Maps DB connection method IDs to the frontend ConnectionMethod type.
const CM_TO_METHOD: Record<string, ConnectionMethod> = {
  csv_file: 'csv',
  mcp_server: 'mcp',
};

const CM_LABELS: Record<string, string> = {
  csv_file: 'CSV File Upload',
  mcp_server: 'MCP Server (Model Context Protocol)',
  cloud_saas: 'Cloud (SaaS)',
  on_premise: 'On-Premise',
};

export interface UseErpCascadeReturn {
  vendorOptions: SelectOption[];
  productOptions: SelectOption[];
  connectionMethodOptions: SelectOption[];
  selectedVendor: string | null;
  isLoadingVendors: boolean;
  isLoadingProducts: boolean;
  onVendorChange: (vendor: string) => void;
  onProductChange: (productId: string) => void;
}

export function useErpCascade(
  selectedErpId: string | null,
  onSelectErp: (id: string | null) => void,
  onSelectMethod: (method: ConnectionMethod) => void,
  role: string,
  onVendorResolved?: (vendor: string | null) => void,
): UseErpCascadeReturn {
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [currentProducts, setCurrentProducts] = useState<CatalogueProduct[]>([]);

  // Fetch all vendors once on mount
  const vendorsQuery = useQuery({
    queryKey: ['erp-catalogue-vendors'] as const,
    queryFn: async () => {
      const result = await getCatalogueVendors(httpClient);
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch products when vendor is selected
  const productsQuery = useQuery({
    queryKey: ['erp-catalogue-products', selectedVendor] as const,
    queryFn: async () => {
      if (!selectedVendor) return [];
      const result = await getCatalogueProducts(httpClient, selectedVendor);
      if (!result.ok) throw result.error;
      return result.data;
    },
    enabled: selectedVendor !== null,
    staleTime: 10 * 60 * 1000,
  });

  // Sync products into local state when the query resolves
  useEffect(() => {
    if (productsQuery.data) {
      setCurrentProducts(productsQuery.data);
    }
  }, [productsQuery.data]);

  // When selectedErpId is set externally (e.g. draft hydration), reverse-resolve the vendor
  useEffect(() => {
    if (selectedErpId && currentProducts.length > 0) {
      const match = currentProducts.find((p) => p.id === selectedErpId);
      if (match && match.vendor !== selectedVendor) {
        setSelectedVendor(match.vendor);
      }
    }
  }, [selectedErpId, currentProducts, selectedVendor]);

  const vendorOptions: SelectOption[] = (vendorsQuery.data ?? []).map((v) => ({
    label: v.vendor,
    value: v.vendor,
  }));

  const productOptions: SelectOption[] = currentProducts.map((p) => ({
    label: p.product_name,
    value: p.id,
  }));

  // Derive connection method options from the selected product
  const selectedProduct = selectedErpId
    ? currentProducts.find((p) => p.id === selectedErpId)
    : null;

  const connectionMethodOptions: SelectOption[] = selectedProduct
    ? selectedProduct.connection_methods
        .filter((cm) => cm in CM_TO_METHOD) // only show methods the UI supports
        .map((cm) => ({
          label: CM_LABELS[cm] ?? cm,
          value: CM_TO_METHOD[cm] as string,
        }))
    : [];

  const onVendorChange = useCallback(
    (vendor: string) => {
      setSelectedVendor(vendor);
      setCurrentProducts([]);
      onSelectErp(null);
      onVendorResolved?.(vendor);
    },
    [onSelectErp, onVendorResolved],
  );

  const onProductChange = useCallback(
    (productId: string) => {
      onSelectErp(productId);
      const product = currentProducts.find((p) => p.id === productId);
      if (product) {
        // Report vendor to parent so it can include it in the create payload
        onVendorResolved?.(product.vendor);
        const firstSupported = product.connection_methods.find(
          (cm) => cm in CM_TO_METHOD,
        );
        if (firstSupported) {
          onSelectMethod(CM_TO_METHOD[firstSupported] as ConnectionMethod);
        }
      }
    },
    [currentProducts, onSelectErp, onSelectMethod, onVendorResolved],
  );

  return {
    vendorOptions,
    productOptions,
    connectionMethodOptions,
    selectedVendor,
    isLoadingVendors: vendorsQuery.isLoading,
    isLoadingProducts: productsQuery.isLoading,
    onVendorChange,
    onProductChange,
  };
}
