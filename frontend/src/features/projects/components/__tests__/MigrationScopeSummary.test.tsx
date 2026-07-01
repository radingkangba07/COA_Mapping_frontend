import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MigrationScopeSummary } from '../MigrationScopeSummary';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('MigrationScopeSummary', () => {
  it('renders the master-data and opening-balances counts', () => {
    render(
      <MigrationScopeSummary
        testID="summary"
        masterDataCount={3}
        masterDataTotal={9}
        openingBalancesCount={5}
        openingBalancesTotal={5}
      />,
    );

    expect(screen.getByTestId('summary-master-data')).toHaveTextContent(
      '3 of 9',
    );
    expect(screen.getByTestId('summary-opening-balances')).toHaveTextContent(
      '5 of 5',
    );
  });
});
