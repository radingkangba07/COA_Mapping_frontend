import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { MasterDataRowVM } from '../../hooks/useMigrationScopeViewModel';
import { CHART_OF_ACCOUNTS_ID } from '../MigrationScope.config';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// The project's global reanimated mock resolves to {} on this version, so the
// Collapsible's useSharedValue/withTiming are undefined. Provide a minimal
// animated-API stub so the real Collapsible can mount in tests.
jest.mock('react-native-reanimated', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const AnimatedView = ReactModule.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      ReactModule.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (toValue: unknown) => toValue,
  };
});

// config/theme is not globally mocked; mirror MCPConnectionPanel.test conventions.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
    destructive: '#DC2626',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { MasterDataTable } from '../MasterDataTable';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<MasterDataRowVM> = {}): MasterDataRowVM {
  return {
    id: 'customers',
    label: 'Customers',
    description: 'Customer master records.',
    dataConversion: false,
    mdm: false,
    ...overrides,
  };
}

const coaRow: MasterDataRowVM = makeRow({
  id: CHART_OF_ACCOUNTS_ID,
  label: 'Chart of Accounts',
  description: 'General ledger structure.',
});

const otherRow: MasterDataRowVM = makeRow({ id: 'vendors', label: 'Vendors' });

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('MasterDataTable', () => {
  it('keeps the Data Conversion checkbox clickable for every scope, not just Chart of Accounts', () => {
    const onToggleColumn = jest.fn();
    render(
      <MasterDataTable
        testID="md"
        rows={[coaRow, otherRow]}
        onToggleColumn={onToggleColumn}
      />,
    );

    const coaDataConversion = screen.getByTestId(
      'md-chart-of-accounts-dataConversion',
    );
    expect(coaDataConversion).toHaveProp('accessibilityState', {
      checked: false,
      disabled: false,
    });
    fireEvent.press(coaDataConversion);
    expect(onToggleColumn).toHaveBeenCalledWith(
      CHART_OF_ACCOUNTS_ID,
      'dataConversion',
    );

    onToggleColumn.mockClear();
    const vendorsDataConversion = screen.getByTestId('md-vendors-dataConversion');
    expect(vendorsDataConversion).toHaveProp('accessibilityState', {
      checked: false,
      disabled: false,
    });
    fireEvent.press(vendorsDataConversion);
    expect(onToggleColumn).toHaveBeenCalledWith('vendors', 'dataConversion');
  });
});
