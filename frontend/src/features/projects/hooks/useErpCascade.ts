import { useEffect, useRef, useCallback } from 'react';
import { ERP_CATALOGUE } from '../data/erp-catalogue.data';
import { useProjectScopeStore } from '../store/project-scope.store';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';
import type { ConnectionMethod } from '../types/project-scope.types';
import type { SelectOption } from '@/shared/components/ui/Select';

interface VendorPref { productId: string; method: string | null }

async function loadVendorPrefs(): Promise<Record<string, VendorPref>> {
  const raw = await storageService.get(STORAGE_KEYS.VENDOR_PREFS);
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, VendorPref>; } catch { return {}; }
}

async function saveVendorPref(vendor: string, productId: string, method: string | null): Promise<void> {
  const map = await loadVendorPrefs();
  map[vendor] = { productId, method };
  await storageService.set(STORAGE_KEYS.VENDOR_PREFS, JSON.stringify(map));
}

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

  const catalogue = ERP_CATALOGUE;

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

  // Keep a ref to currentProducts so the vendor-prefs effect can read the
  // latest list without it becoming a dependency (avoids infinite loops).
  const currentProductsRef = useRef(currentProducts);
  currentProductsRef.current = currentProducts;

  // When the user picks a vendor, auto-fill product + connection method from cache.
  // Skips if a product is already selected (avoids overwriting an existing selection).
  useEffect(() => {
    if (!selectedVendor || selectedErpId) return;
    void loadVendorPrefs().then((map) => {
      const pref = map[selectedVendor];
      if (!pref) return;
      const products = currentProductsRef.current;
      const match = products.find((p) => p.id === pref.productId);
      if (!match) return;
      onSelectErp(pref.productId);
      if (pref.method && pref.method in CM_TO_METHOD) {
        onSelectMethod(CM_TO_METHOD[pref.method] as ConnectionMethod);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendor]);

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
        const resolvedMethod = firstSupported
          ? (CM_TO_METHOD[firstSupported.id] as ConnectionMethod)
          : null;
        if (resolvedMethod) {
          onSelectMethod(resolvedMethod);
        }
        // Persist this vendor → product + method pairing for future autofill
        if (selectedVendor) {
          void saveVendorPref(selectedVendor, productId, resolvedMethod);
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
    isLoadingVendors: false,
    isLoadingProducts: false,
    onVendorChange,
    onProductChange,
  };
}
