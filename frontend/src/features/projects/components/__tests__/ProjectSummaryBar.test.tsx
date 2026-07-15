import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProjectSummaryBar } from '../ProjectSummaryBar';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('ProjectSummaryBar', () => {
  it('renders a combined connection chip when methods differ', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: 'SAP',
          target: 'NetSuite',
          connectionMethod: 'Source: MCP Server / Target: CSV File Upload',
          masterData: '3 of 9 selected',
          openingBalances: '2 of 5 selected',
          members: '4',
        }}
      />,
    );

    expect(screen.getByTestId('bar-chip-source-value')).toHaveTextContent('SAP');
    expect(screen.getByTestId('bar-chip-target-value')).toHaveTextContent('NetSuite');
    expect(screen.getByTestId('bar-chip-connection-method-value')).toHaveTextContent(
      'Source: MCP Server / Target: CSV File Upload',
    );
    expect(screen.getByTestId('bar-chip-master-data-value')).toHaveTextContent('3 of 9 selected');
    expect(screen.getByTestId('bar-chip-opening-balances-value')).toHaveTextContent('2 of 5 selected');
    expect(screen.getByTestId('bar-chip-members-value')).toHaveTextContent('4');
  });

  it('renders the method value directly when both sides match', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: 'SAP',
          target: 'NetSuite',
          connectionMethod: 'MCP Server',
          masterData: '3 of 9 selected',
          openingBalances: '2 of 5 selected',
          members: '4',
        }}
      />,
    );

    expect(screen.getByTestId('bar-chip-connection-method-value')).toHaveTextContent('MCP Server');
  });

  it('renders placeholders for null source/target/connection while counts still format', () => {
    render(
      <ProjectSummaryBar
        testID="bar"
        summary={{
          source: null,
          target: null,
          connectionMethod: null,
          masterData: '0 of 9 selected',
          openingBalances: '0 of 5 selected',
          members: '0',
        }}
      />,
    );

    expect(screen.getByTestId('bar-chip-source-value')).toHaveTextContent('Select source');
    expect(screen.getByTestId('bar-chip-target-value')).toHaveTextContent('Select target');
    expect(screen.getByTestId('bar-chip-connection-method-value')).toHaveTextContent('Not set');
    expect(screen.getByTestId('bar-chip-master-data-value')).toHaveTextContent('0 of 9 selected');
    expect(screen.getByTestId('bar-chip-opening-balances-value')).toHaveTextContent('0 of 5 selected');
    expect(screen.getByTestId('bar-chip-members-value')).toHaveTextContent('0');
  });
});
