import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Database } from 'lucide-react-native';
import { SummaryChip } from '../SummaryChip';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('SummaryChip', () => {
  it('renders the label and the value when value is a non-empty string', () => {
    render(
      <SummaryChip
        icon={Database}
        label="Source ERP"
        value="SAP"
        testID="chip"
      />,
    );

    expect(screen.getByText('Source ERP')).toBeTruthy();
    expect(screen.getByTestId('chip-value')).toHaveTextContent('SAP');
  });

  it('renders the default placeholder "Not set" when value is null', () => {
    render(
      <SummaryChip
        icon={Database}
        label="Source ERP"
        value={null}
        testID="chip"
      />,
    );

    expect(screen.getByTestId('chip-value')).toHaveTextContent('Not set');
  });

  it('renders a custom placeholder when value is null and a placeholder prop is given', () => {
    render(
      <SummaryChip
        icon={Database}
        label="Source ERP"
        value={null}
        placeholder="Select source"
        testID="chip"
      />,
    );

    expect(screen.getByTestId('chip-value')).toHaveTextContent('Select source');
  });

  it('renders the placeholder when value is an empty string', () => {
    render(
      <SummaryChip
        icon={Database}
        label="Source ERP"
        value=""
        placeholder="Select source"
        testID="chip"
      />,
    );

    expect(screen.getByTestId('chip-value')).toHaveTextContent('Select source');
  });
});
