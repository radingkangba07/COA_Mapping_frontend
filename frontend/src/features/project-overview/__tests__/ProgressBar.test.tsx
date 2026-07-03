import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from '../components/ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    render(<ProgressBar value={50} testID="pb" />);
    expect(screen.getByTestId('pb')).toBeTruthy();
  });

  it('does not show label by default', () => {
    render(<ProgressBar value={50} testID="pb" />);
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('shows percentage label when showLabel=true', () => {
    render(<ProgressBar value={50} showLabel />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('clamps value above 100 to 100%', () => {
    render(<ProgressBar value={150} showLabel />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('clamps value below 0 to 0%', () => {
    render(<ProgressBar value={-10} showLabel />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('shows 0% label for zero value', () => {
    render(<ProgressBar value={0} showLabel />);
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('fill track has correct test IDs', () => {
    render(<ProgressBar value={75} testID="pb" />);
    expect(screen.getByTestId('pb-track')).toBeTruthy();
    expect(screen.getByTestId('pb-fill')).toBeTruthy();
  });

  it('fill has zero minWidth when value is 0', () => {
    render(<ProgressBar value={0} testID="pb" />);
    const fill = screen.getByTestId('pb-fill');
    expect(fill.props.style).toEqual(
      expect.objectContaining({ minWidth: 0 }),
    );
  });

  it('fill has non-zero minWidth when value is positive', () => {
    render(<ProgressBar value={40} testID="pb" />);
    const fill = screen.getByTestId('pb-fill');
    expect(fill.props.style).toEqual(
      expect.objectContaining({ minWidth: 6 }),
    );
  });
});
