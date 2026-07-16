import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/services/http/http.instance';
import { getCatalogueVendors } from '../services/erp-catalogue.service';
import { useProjectScopeStore } from '../store/project-scope.store';
import type { ConnectionMethod } from '../types/project-scope.types';
import type { SelectOption } from '@/shared/components/ui/Select';

// Maps DB connection method IDs to the frontend ConnectionMethod type.
const CM_TO_METHOD: Record<string, ConnectionMethod> = {
  csv_file: 'csv',
  mcp_server: 'mcp',
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
  role: 'source' | 'target',
  onVendorResolved?: (vendor: string | null) => void,
): UseErpCascadeReturn {
  // Vendor selection persisted in Zustand so it survives remounts
  const selectedVendor = useProjectScopeStore((s) =>
    role === 'source' ? s.draft.sourceVendor : s.draft.targetVendor,
  );
  const setVendorInStore = useProjectScopeStore((s) =>
    role === 'source' ? s.setSourceVendor : s.setTargetVendor,
  );

  // Single query — full vendor → product → connection method tree, cached 10 min
  const catalogueQuery = useQuery({
    queryKey: ['erp-catalogue'] as const,
    queryFn: async () => {
      const result = await getCatalogueVendors(httpClient);
      if (!result.ok) throw result.error;
      return result.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const catalogue = catalogueQuery.data ?? [];

  // Products for the selected vendor — derived locally, no extra fetch
  const currentProducts =
    catalogue.find((v) => v.vendor === selectedVendor)?.products ?? [];

  // When selectedErpId is set externally (e.g. draft hydration), reverse-resolve the vendor
  useEffect(() => {
    if (!selectedErpId || !catalogue.length) return;
    for (const v of catalogue) {
      const match = v.products.find((p) => p.id === selectedErpId);
      if (match && v.vendor !== selectedVendor) {
        setVendorInStore(v.vendor);
        break;
      }
    }
  }, [selectedErpId, catalogue, selectedVendor, setVendorInStore]);

  const vendorOptions: SelectOption[] = catalogue.map((v) => ({
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
    ? [...selectedProduct.connection_methods]
        .sort((a, b) => {
          const aSupported = a.id in CM_TO_METHOD ? 0 : 1;
          const bSupported = b.id in CM_TO_METHOD ? 0 : 1;
          return aSupported - bSupported;
        })
        .map((cm) => {
          const isSupported = cm.id in CM_TO_METHOD;
          return {
            label: cm.name,
            value: isSupported ? (CM_TO_METHOD[cm.id] as string) : cm.id,
            disabled: !isSupported,
          };
        })
    : [];

  const onVendorChange = useCallback(
    (vendor: string) => {
      setVendorInStore(vendor);
      onSelectErp(null);
      onVendorResolved?.(vendor);
    },
    [setVendorInStore, onSelectErp, onVendorResolved],
  );

  const onProductChange = useCallback(
    (productId: string) => {
      onSelectErp(productId);
      const product = currentProducts.find((p) => p.id === productId);
      if (product) {
        onVendorResolved?.(selectedVendor);
        const firstSupported = product.connection_methods.find(
          (cm) => cm.id in CM_TO_METHOD,
        );
        if (firstSupported) {
          onSelectMethod(CM_TO_METHOD[firstSupported.id] as ConnectionMethod);
        }
      }
    },
    [currentProducts, selectedVendor, onSelectErp, onSelectMethod, onVendorResolved],
  );

  return {
    vendorOptions,
    productOptions,
    connectionMethodOptions,
    selectedVendor,
    isLoadingVendors: catalogueQuery.isLoading,
    isLoadingProducts: catalogueQuery.isLoading,
    onVendorChange,
    onProductChange,
  };
}
