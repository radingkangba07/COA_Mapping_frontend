// Unit tests for useErpCascade — mocks react-query, the store, and async storage.

import type { JSX, ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

jest.mock('../../services/erp-catalogue.service', () => ({
  getCatalogueVendors: jest.fn(),
}));

jest.mock('@/shared/services/storage/storage.service', () => ({
  storageService: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) },
}));

import { ok } from '@/shared/types/result.types';
import { getCatalogueVendors } from '../../services/erp-catalogue.service';
import { useProjectScopeStore } from '../../store/project-scope.store';
import { useErpCascade } from '../useErpCascade';

const mockGetCatalogueVendors = getCatalogueVendors as jest.MockedFunction<typeof getCatalogueVendors>;

const CATALOGUE = [
  {
    vendor: 'Oracle',
    products: [
      {
        id: 'oracle_netsuite',
        product_name: 'NetSuite',
        connection_methods: [
          { id: 'csv_file', name: 'CSV File', requires_mcp_config: false },
          { id: 'mcp_server', name: 'MCP Server', requires_mcp_config: true },
        ],
      },
    ],
  },
  {
    vendor: 'Odoo',
    products: [
      {
        id: 'odoo',
        product_name: 'Odoo Community',
        connection_methods: [{ id: 'csv_file', name: 'CSV File', requires_mcp_config: false }],
      },
    ],
  },
];

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockGetCatalogueVendors.mockResolvedValue(ok(CATALOGUE) as Awaited<ReturnType<typeof getCatalogueVendors>>);
  useProjectScopeStore.getState().reset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useErpCascade', () => {
  it('returns vendor options from the catalogue query', async () => {
    const onSelectErp = jest.fn();
    const onSelectMethod = jest.fn();

    const { result } = renderHook(
      () => useErpCascade(null, onSelectErp, onSelectMethod, 'source'),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.vendorOptions.map((v) => v.value)).toContain('Oracle');
    });
    expect(result.current.vendorOptions.map((v) => v.value)).toContain('Odoo');
  });

  it('starts with no product options when no vendor is selected', async () => {
    const { result } = renderHook(
      () => useErpCascade(null, jest.fn(), jest.fn(), 'source'),
      { wrapper },
    );

    await act(async () => { await Promise.resolve(); });

    expect(result.current.productOptions).toHaveLength(0);
  });

  it('onVendorChange sets the vendor in the store and clears the ERP selection', async () => {
    const onSelectErp = jest.fn();
    const onSelectMethod = jest.fn();

    const { result } = renderHook(
      () => useErpCascade(null, onSelectErp, onSelectMethod, 'source'),
      { wrapper },
    );

    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.onVendorChange('Oracle'); });

    expect(result.current.selectedVendor).toBe('Oracle');
    expect(onSelectErp).toHaveBeenCalledWith(null);
  });

  it('shows product options after a vendor is selected', async () => {
    const onSelectErp = jest.fn();
    const { result } = renderHook(
      () => useErpCascade(null, onSelectErp, jest.fn(), 'source'),
      { wrapper },
    );

    await act(async () => { await Promise.resolve(); });
    act(() => { result.current.onVendorChange('Oracle'); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.productOptions).toHaveLength(1);
    expect(result.current.productOptions[0]?.value).toBe('oracle_netsuite');
  });

  it('onProductChange calls onSelectErp with the product id', async () => {
    const onSelectErp = jest.fn();
    const onSelectMethod = jest.fn();
    const { result } = renderHook(
      () => useErpCascade(null, onSelectErp, onSelectMethod, 'source'),
      { wrapper },
    );

    await act(async () => { await Promise.resolve(); });
    act(() => { result.current.onVendorChange('Oracle'); });
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.onProductChange('oracle_netsuite'); });

    expect(onSelectErp).toHaveBeenCalledWith('oracle_netsuite');
  });

  it('onProductChange calls onSelectMethod with the preferred csv method', async () => {
    const onSelectErp = jest.fn();
    const onSelectMethod = jest.fn();
    const { result } = renderHook(
      () => useErpCascade(null, onSelectErp, onSelectMethod, 'source'),
      { wrapper },
    );

    await act(async () => { await Promise.resolve(); });
    act(() => { result.current.onVendorChange('Oracle'); });
    await act(async () => { await Promise.resolve(); });
    act(() => { result.current.onProductChange('oracle_netsuite'); });

    // csv_file maps to 'csv', mcp_server maps to 'mcp'; csv is preferred
    expect(onSelectMethod).toHaveBeenCalledWith('csv');
  });

  it('returns isLoadingVendors true while the query is pending', () => {
    // Don't resolve the mock so the query stays in loading state
    mockGetCatalogueVendors.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useErpCascade(null, jest.fn(), jest.fn(), 'source'),
      { wrapper },
    );

    expect(result.current.isLoadingVendors).toBe(true);
  });

  it('uses the target store slice when role is target', async () => {
    const { result } = renderHook(
      () => useErpCascade(null, jest.fn(), jest.fn(), 'target'),
      { wrapper },
    );

    await act(async () => { await Promise.resolve(); });
    act(() => { result.current.onVendorChange('Odoo'); });

    // selectedVendor on the hook reflects the store's targetVendor
    expect(result.current.selectedVendor).toBe('Odoo');
    // Source vendor must remain untouched
    expect(useProjectScopeStore.getState().draft.sourceVendor).toBeNull();
  });

  it('derives connection method options from the selected product', async () => {
    const { result } = renderHook(
      () => useErpCascade('oracle_netsuite', jest.fn(), jest.fn(), 'source'),
      { wrapper },
    );

    // Manually set the vendor so the product can be resolved from selectedErpId
    act(() => { useProjectScopeStore.getState().setSourceVendor('Oracle'); });
    await waitFor(() => {
      expect(result.current.connectionMethodOptions.length).toBeGreaterThan(0);
    });

  });
});
