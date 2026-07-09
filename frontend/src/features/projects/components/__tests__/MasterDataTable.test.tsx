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

const enabledRow: MasterDataRowVM = makeRow({ id: 'customers' });

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('MasterDataTable', () => {
  it('renders the Chart of Accounts checkboxes as clickable with no gated hint', () => {
    const onToggleColumn = jest.fn();
    render(
      <MasterDataTable
        testID="md"
        rows={[coaRow, enabledRow]}
        onToggleColumn={onToggleColumn}
      />,
    );

    expect(
      screen.queryByTestId('md-chart-of-accounts-gated-hint'),
    ).toBeNull();

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

    fireEvent.press(screen.getByTestId('md-chart-of-accounts-mdm'));
    expect(onToggleColumn).toHaveBeenCalledWith(CHART_OF_ACCOUNTS_ID, 'mdm');
  });

  it('calls onToggleColumn with id + column for a normal row and renders no gated hint', () => {
    const onToggleColumn = jest.fn();
    render(
      <MasterDataTable
        testID="md"
        rows={[coaRow, enabledRow]}
        onToggleColumn={onToggleColumn}
      />,
    );

    expect(screen.queryByTestId('md-customers-gated-hint')).toBeNull();

    fireEvent.press(screen.getByTestId('md-customers-dataConversion'));
    expect(onToggleColumn).toHaveBeenCalledWith('customers', 'dataConversion');

    fireEvent.press(screen.getByTestId('md-customers-mdm'));
    expect(onToggleColumn).toHaveBeenCalledWith('customers', 'mdm');
  });
});
