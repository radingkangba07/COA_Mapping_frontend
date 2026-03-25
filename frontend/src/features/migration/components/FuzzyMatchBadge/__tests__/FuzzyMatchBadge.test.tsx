import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FuzzyMatchBadge } from '../FuzzyMatchBadge';

describe('FuzzyMatchBadge', () => {
  it('shows "High" label and green bg for score >= 90', () => {
    render(<FuzzyMatchBadge score={95} testID="badge" />);
    expect(screen.getByText('95% High')).toBeTruthy();
    const badge = screen.getByTestId('badge');
    const classNameProp: string = badge.props.className ?? '';
    expect(classNameProp).toContain('bg-green-100');
  });

  it('shows "Medium" label and yellow bg for score 70-89', () => {
    render(<FuzzyMatchBadge score={75} testID="badge" />);
    expect(screen.getByText('75% Medium')).toBeTruthy();
    const badge = screen.getByTestId('badge');
    const classNameProp: string = badge.props.className ?? '';
    expect(classNameProp).toContain('bg-yellow-100');
  });

  it('shows "Low" label and red bg for score < 70', () => {
    render(<FuzzyMatchBadge score={45} testID="badge" />);
    expect(screen.getByText('45% Low')).toBeTruthy();
    const badge = screen.getByTestId('badge');
    const classNameProp: string = badge.props.className ?? '';
    expect(classNameProp).toContain('bg-red-100');
  });

  it('rounds score to integer', () => {
    render(<FuzzyMatchBadge score={85.7} />);
    // 85.7 rounds to 86, which is >= 70 but < 90 => Medium
    expect(screen.getByText('86% Medium')).toBeTruthy();
    expect(screen.queryByText('85.7%')).toBeNull();
  });

  it('shows percentage text with label by default', () => {
    render(<FuzzyMatchBadge score={92} />);
    expect(screen.getByText('92% High')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    render(<FuzzyMatchBadge score={92} showLabel={false} />);
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.queryByText('92% High')).toBeNull();
  });

  it('has correct accessibilityLabel', () => {
    render(<FuzzyMatchBadge score={95} testID="badge" />);
    const badge = screen.getByTestId('badge');
    expect(badge.props.accessibilityLabel).toBe(
      'Confidence score: 95% High',
    );
  });

  it('includes label in accessibilityLabel even when showLabel is false', () => {
    render(
      <FuzzyMatchBadge score={75} showLabel={false} testID="badge" />,
    );
    const badge = screen.getByTestId('badge');
    expect(badge.props.accessibilityLabel).toBe(
      'Confidence score: 75% Medium',
    );
  });

  it('passes testID prop through', () => {
    render(<FuzzyMatchBadge score={50} testID="fuzzy-badge" />);
    expect(screen.getByTestId('fuzzy-badge')).toBeTruthy();
  });

  it('boundary: score of exactly 90 is High', () => {
    render(<FuzzyMatchBadge score={90} />);
    expect(screen.getByText('90% High')).toBeTruthy();
  });

  it('boundary: score of exactly 70 is Medium', () => {
    render(<FuzzyMatchBadge score={70} />);
    expect(screen.getByText('70% Medium')).toBeTruthy();
  });

  it('boundary: score of 69 is Low', () => {
    render(<FuzzyMatchBadge score={69} />);
    expect(screen.getByText('69% Low')).toBeTruthy();
  });
});
