import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProjectSummaryBar } from '../ProjectSummaryBar';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('ProjectSummaryBar', () => {
  it('renders all chip values for a fully-populated summary', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: 'SAP',
          target: 'NetSuite',
          sourceMethod: 'MCP Server',
          targetMethod: 'CSV File Upload',
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
    expect(
      screen.getByTestId('bar-chip-source-method-value'),
    ).toHaveTextContent('MCP Server');
    expect(
      screen.getByTestId('bar-chip-target-method-value'),
    ).toHaveTextContent('CSV File Upload');
    expect(screen.getByTestId('bar-chip-master-data-value')).toHaveTextContent(
      '3 of 9 selected',
    );
    expect(
      screen.getByTestId('bar-chip-opening-balances-value'),
    ).toHaveTextContent('2 of 5 selected');
    expect(screen.getByTestId('bar-chip-members-value')).toHaveTextContent('4');
  });

  it('renders placeholders for null source/target/methods while counts still format', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: null,
          target: null,
          sourceMethod: null,
          targetMethod: null,
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
    expect(
      screen.getByTestId('bar-chip-source-method-value'),
    ).toHaveTextContent('Not set');
    expect(
      screen.getByTestId('bar-chip-target-method-value'),
    ).toHaveTextContent('Not set');
    expect(screen.getByTestId('bar-chip-master-data-value')).toHaveTextContent(
      '0 of 9 selected',
    );
    expect(
      screen.getByTestId('bar-chip-opening-balances-value'),
    ).toHaveTextContent('0 of 5 selected');
    expect(screen.getByTestId('bar-chip-members-value')).toHaveTextContent('0');
  });
});
