// Component tests for ErpSourceTargetSelect — mocks useErpCascade so we test
// structure and callback wiring without triggering network or react-query.

import React from 'react';
import { View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
  },
}));

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

// Stub the entire cascade hook so the component renders predictably.
const mockOnVendorChange = jest.fn();
const mockOnProductChange = jest.fn();
const mockOnMethodChange = jest.fn();

jest.mock('../../hooks/useErpCascade', () => ({
  useErpCascade: () => ({
    vendorOptions: [
      { label: 'Oracle', value: 'Oracle' },
      { label: 'Odoo', value: 'Odoo' },
    ],
    productOptions: [
      { label: 'NetSuite', value: 'oracle_netsuite' },
    ],
    connectionMethodOptions: [
      { label: 'CSV File', value: 'csv' },
    ],
    selectedVendor: null,
    isLoadingVendors: false,
    isLoadingProducts: false,
    onVendorChange: mockOnVendorChange,
    onProductChange: mockOnProductChange,
    onMethodChange: mockOnMethodChange,
  }),
}));

import { ErpSourceTargetSelect } from '../ErpSourceTargetSelect';

const defaultProps: React.ComponentProps<typeof ErpSourceTargetSelect> = {
  erpSystems: [],
  source: null,
  target: null,
  sourceMethod: 'csv',
  targetMethod: 'csv',
  onSelectSource: jest.fn(),
  onSelectTarget: jest.fn(),
  onSelectSourceMethod: jest.fn(),
  onSelectTargetMethod: jest.fn(),
};

beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ErpSourceTargetSelect', () => {
  it('renders the source ERP card', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    expect(screen.getByTestId('erp-card-source')).toBeTruthy();
  });

  it('renders the target ERP card', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    expect(screen.getByTestId('erp-card-target')).toBeTruthy();
  });

  it('renders the source label', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    expect(screen.getByText('Source ERP (From)')).toBeTruthy();
  });

  it('renders the target label', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    expect(screen.getByText('Target ERP (To)')).toBeTruthy();
  });

  it('renders both vendor select triggers', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    expect(screen.getByTestId('erp-vendor-select-source')).toBeTruthy();
    expect(screen.getByTestId('erp-vendor-select-target')).toBeTruthy();
  });

  it('renders both product select triggers', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    expect(screen.getByTestId('erp-product-select-source')).toBeTruthy();
    expect(screen.getByTestId('erp-product-select-target')).toBeTruthy();
  });

  it('calls onVendorChange when a vendor is selected on the source card', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);

    fireEvent.press(screen.getByTestId('erp-vendor-select-source-trigger'));
    fireEvent.press(screen.getByTestId('erp-vendor-select-source-option-Oracle'));

    expect(mockOnVendorChange).toHaveBeenCalledWith('Oracle');
  });

  it('forwards the testID to the root view', () => {
    render(<ErpSourceTargetSelect {...defaultProps} testID="scope-select" />);
    expect(screen.getByTestId('scope-select')).toBeTruthy();
  });

  it('renders step labels inside each card', () => {
    render(<ErpSourceTargetSelect {...defaultProps} />);
    const stepOneLabels = screen.getAllByText('Step 1: Select Vendor');
    expect(stepOneLabels).toHaveLength(2);
  });
});
