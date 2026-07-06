import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatCard } from '../components/StatCard';

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Completed" value={5} />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('renders the numeric value', () => {
    render(<StatCard label="Total" value={14} />);
    expect(screen.getByText('14')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard label="Total" value={14} subtitle="Workstreams in scope" />);
    expect(screen.getByText('Workstreams in scope')).toBeTruthy();
  });

  it('does not render subtitle element when omitted', () => {
    render(<StatCard label="Total" value={14} testID="card" />);
    expect(screen.queryByText('Workstreams in scope')).toBeNull();
  });

  it('renders skeleton instead of value when isLoading=true', () => {
    render(<StatCard label="Total" value={14} isLoading testID="card" />);
    // Value text should not appear while loading
    expect(screen.queryByText('14')).toBeNull();
  });

  it('accepts testID prop', () => {
    render(<StatCard label="Blocked" value={2} testID="sc-blocked" />);
    expect(screen.getByTestId('sc-blocked')).toBeTruthy();
  });

  it.each([
    'default', 'success', 'info', 'warning', 'danger', 'muted',
  ] as const)('renders tone=%s without crashing', (tone) => {
    render(<StatCard label="X" value={1} tone={tone} testID={`card-${tone}`} />);
    expect(screen.getByTestId(`card-${tone}`)).toBeTruthy();
  });
});
