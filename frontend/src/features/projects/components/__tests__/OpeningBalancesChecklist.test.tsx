import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { OpeningBalanceRowVM } from '../../hooks/useMigrationScopeViewModel';
import { OPENING_BALANCE_ITEMS } from '../MigrationScope.config';

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
import { OpeningBalancesChecklist } from '../OpeningBalancesChecklist';

// ─── Helpers ────────────────────────────────────────────────────────────────

const items: readonly OpeningBalanceRowVM[] = OPENING_BALANCE_ITEMS.map(
  (item) => ({ id: item.id, label: item.label, selected: false }),
);

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('OpeningBalancesChecklist', () => {
  it('renders one checkbox per item', () => {
    render(
      <OpeningBalancesChecklist
        testID="ob"
        items={items}
        onToggle={jest.fn()}
      />,
    );

    for (const item of items) {
      expect(screen.getByTestId(`ob-${item.id}`)).toBeTruthy();
    }
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
  });

  it('renders all checkboxes disabled — pressing them does not toggle', () => {
    const onToggle = jest.fn();
    render(
      <OpeningBalancesChecklist testID="ob" items={items} onToggle={onToggle} />,
    );

    expect(
      screen.getByTestId('ob-historical-balance-sheet-start'),
    ).toHaveProp('accessibilityState', { checked: false, disabled: true });

    fireEvent.press(screen.getByTestId('ob-historical-balance-sheet-start'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
