// DA-216 (AC: DA-171) — QA: Connection-method selection in Project Setup.
// Component test. ErpSourceTargetSelect drives its options through useErpCascade
// (react-query + catalogue API + store); that hook is mocked here so the test
// focuses on the connection-method select wiring without the catalogue machinery.
// The custom Select opens via an async measureInWindow callback (patched to fire
// synchronously), which is why this is a component test rather than E2E.

import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ConnectionMethod } from '../../types/project-scope.types';

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    accent: '#2563EB',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
    border: '#E4E4E7',
    card: '#FFFFFF',
    cardForeground: '#09090B',
  },
}));

jest.mock('lucide-react-native', () => {
  const { View: RNView } = require('react-native');
  const icon = (name: string) => (props: Record<string, unknown>) => <RNView testID={`${name}-icon`} {...props} />;
  return new Proxy({ __esModule: true }, { get: (t: Record<string, unknown>, p: string) => (p in t ? t[p] : icon(p)) });
});

// Mock the ERP cascade hook: fixed vendor/product/method options so the selects
// render deterministically. Connection-method values are the frontend
// ConnectionMethod values ('mcp' / 'csv').
jest.mock('../../hooks/useErpCascade', () => ({
  useErpCascade: () => ({
    vendorOptions: [{ label: 'Xero', value: 'Xero' }],
    productOptions: [{ label: 'Xero', value: 'xero' }],
    connectionMethodOptions: [
      { label: 'MCP Server (Model Context Protocol)', value: 'mcp' },
      { label: 'CSV File Upload', value: 'csv' },
    ],
    selectedVendor: 'Xero',
    isLoadingVendors: false,
    isLoadingProducts: false,
    onVendorChange: jest.fn(),
    onProductChange: jest.fn(),
  }),
}));

import { ErpSourceTargetSelect } from '../ErpSourceTargetSelect';

// The Select menu opens via triggerRef.measureInWindow(cb); patch the host View
// to invoke it synchronously.
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

const baseProps = {
  erpSystems: [],
  source: 'xero',
  target: 'oracle_netsuite',
  sourceMethod: 'csv' as ConnectionMethod,
  targetMethod: 'csv' as ConnectionMethod,
  onSelectSource: jest.fn(),
  onSelectTarget: jest.fn(),
  onSelectSourceMethod: jest.fn(),
  onSelectTargetMethod: jest.fn(),
  testID: 'erp-source-target-select',
};

describe('DA-216 Connection-method selection', () => {
  // TC-01 — a connection-method select on both cards
  it('renders a connection-method select on both cards', () => {
    render(<ErpSourceTargetSelect {...baseProps} />);
    expect(screen.getByTestId('erp-method-select-source-trigger')).toBeTruthy();
    expect(screen.getByTestId('erp-method-select-target-trigger')).toBeTruthy();
  });

  // TC-02 — options are "MCP Server" and "CSV File Upload"
  it('lists MCP Server and CSV File Upload options', () => {
    render(<ErpSourceTargetSelect {...baseProps} />);
    fireEvent.press(screen.getByTestId('erp-method-select-source-trigger'));
    expect(screen.getByTestId('erp-method-select-source-option-mcp')).toHaveTextContent(/MCP Server/);
    expect(screen.getByTestId('erp-method-select-source-option-csv')).toHaveTextContent(/CSV File Upload/);
  });

  // TC-03 — choosing a method fires the source callback
  it('fires onSelectSourceMethod with the chosen method', () => {
    const onSelectSourceMethod = jest.fn<void, [ConnectionMethod]>();
    render(<ErpSourceTargetSelect {...baseProps} onSelectSourceMethod={onSelectSourceMethod} />);
    fireEvent.press(screen.getByTestId('erp-method-select-source-trigger'));
    fireEvent.press(screen.getByTestId('erp-method-select-source-option-mcp'));
    expect(onSelectSourceMethod).toHaveBeenCalledWith('mcp');
  });

  // TC-04 — the two cards are independent
  it('source and target method selects are independent', () => {
    const onSelectSourceMethod = jest.fn();
    const onSelectTargetMethod = jest.fn<void, [ConnectionMethod]>();
    render(
      <ErpSourceTargetSelect
        {...baseProps}
        onSelectSourceMethod={onSelectSourceMethod}
        onSelectTargetMethod={onSelectTargetMethod}
      />,
    );
    fireEvent.press(screen.getByTestId('erp-method-select-target-trigger'));
    fireEvent.press(screen.getByTestId('erp-method-select-target-option-mcp'));
    expect(onSelectTargetMethod).toHaveBeenCalledWith('mcp');
    expect(onSelectSourceMethod).not.toHaveBeenCalled();
  });

  // TC-05 — the trigger reflects the selected method
  it('reflects the selected method on the trigger', () => {
    render(<ErpSourceTargetSelect {...baseProps} sourceMethod={'mcp' as ConnectionMethod} />);
    expect(screen.getByTestId('erp-method-select-source-trigger')).toHaveTextContent(/MCP Server/);
  });

  // TC-06 — the method select is disabled until a product is selected
  it('disables the method select until a product is selected', () => {
    render(<ErpSourceTargetSelect {...baseProps} source={null} />);
    const trigger = screen.getByTestId('erp-method-select-source-trigger');
    expect(trigger.props.accessibilityState?.disabled).toBe(true);
  });
});
