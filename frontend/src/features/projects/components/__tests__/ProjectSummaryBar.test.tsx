import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProjectSummaryBar } from '../ProjectSummaryBar';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('ProjectSummaryBar', () => {
  it('renders all six chip values for a fully-populated summary', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: 'SAP',
          target: 'NetSuite',
          method: 'MCP',
          masterData: '3 of 9 selected',
          openingBalances: '2 of 5 selected',
          members: '4',
        }}
      />,
    );

    expect(screen.getByTestId('bar-chip-source-value')).toHaveTextContent(
      'SAP',
    );
    expect(screen.getByTestId('bar-chip-target-value')).toHaveTextContent(
      'NetSuite',
    );
    expect(screen.getByTestId('bar-chip-method-value')).toHaveTextContent(
      'MCP',
    );
    expect(screen.getByTestId('bar-chip-master-data-value')).toHaveTextContent(
      '3 of 9 selected',
    );
    expect(
      screen.getByTestId('bar-chip-opening-balances-value'),
    ).toHaveTextContent('2 of 5 selected');
    expect(screen.getByTestId('bar-chip-members-value')).toHaveTextContent('4');
  });

  it('renders placeholders for null source/target/method while counts still format', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: null,
          target: null,
          method: null,
          masterData: '0 of 9 selected',
          openingBalances: '0 of 5 selected',
          members: '0',
        }}
      />,
    );

    expect(screen.getByTestId('bar-chip-source-value')).toHaveTextContent(
      'Select source',
    );
    expect(screen.getByTestId('bar-chip-target-value')).toHaveTextContent(
      'Select target',
    );
    expect(screen.getByTestId('bar-chip-method-value')).toHaveTextContent(
      'Not set',
    );
    expect(screen.getByTestId('bar-chip-master-data-value')).toHaveTextContent(
      '0 of 9 selected',
    );
    expect(
      screen.getByTestId('bar-chip-opening-balances-value'),
    ).toHaveTextContent('0 of 5 selected');
    expect(screen.getByTestId('bar-chip-members-value')).toHaveTextContent('0');
  });
});
