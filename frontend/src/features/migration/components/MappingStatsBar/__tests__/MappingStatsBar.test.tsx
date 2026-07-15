import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MappingStatsBar } from '../MappingStatsBar';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const RN = require('react-native');
  const R = require('react');
  const icon = (name: string) => {
    const Icon = (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: `${name}-icon`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy(
    { __esModule: true },
    { get: (_: Record<string, unknown>, prop: string) => icon(prop) },
  );
});

jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', primary: '#2563EB' },
}));

jest.mock('@/shared/utils/string.utils', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/shared/components/ui/Badge', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Badge: ({ children, testID, variant }: { children: React.ReactNode; testID?: string; variant?: string }) =>
      R.createElement(RN.View, { testID: testID ?? `badge-${variant ?? 'default'}` }, children),
  };
});

// ─── Default props ───────────────────────────────────────────────────────────

function defaultProps(overrides = {}) {
  return {
    totalAccounts: 10,
    highConfidence: 4,
    mediumConfidence: 3,
    lowConfidence: 3,
    confirmedCount: 4,
    confirmedHigh: false,
    confirmedMedium: false,
    confirmedLow: false,
    activeFilter: null,
    onFilterPress: jest.fn(),
    testID: 'stats-bar',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MappingStatsBar', () => {
  describe('filter cards', () => {
    it('renders all four stat cards', () => {
      render(<MappingStatsBar {...defaultProps()} />);
      expect(screen.getByTestId('stats-bar-all')).toBeTruthy();
      expect(screen.getByTestId('stats-bar-high')).toBeTruthy();
      expect(screen.getByTestId('stats-bar-medium')).toBeTruthy();
      expect(screen.getByTestId('stats-bar-low')).toBeTruthy();
      expect(screen.getByTestId('stats-bar-confirmed')).toBeTruthy();
    });

    it('calls onFilterPress with null when All card is pressed', () => {
      const onFilterPress = jest.fn();
      render(<MappingStatsBar {...defaultProps({ onFilterPress })} />);
      fireEvent.press(screen.getByTestId('stats-bar-all'));
      expect(onFilterPress).toHaveBeenCalledWith(null);
    });

    it('calls onFilterPress with "high" when High card is pressed', () => {
      const onFilterPress = jest.fn();
      render(<MappingStatsBar {...defaultProps({ onFilterPress })} />);
      fireEvent.press(screen.getByTestId('stats-bar-high'));
      expect(onFilterPress).toHaveBeenCalledWith('high');
    });

    it('calls onFilterPress with "medium" when Medium card is pressed', () => {
      const onFilterPress = jest.fn();
      render(<MappingStatsBar {...defaultProps({ onFilterPress })} />);
      fireEvent.press(screen.getByTestId('stats-bar-medium'));
      expect(onFilterPress).toHaveBeenCalledWith('medium');
    });

    it('calls onFilterPress with "low" when Low card is pressed', () => {
      const onFilterPress = jest.fn();
      render(<MappingStatsBar {...defaultProps({ onFilterPress })} />);
      fireEvent.press(screen.getByTestId('stats-bar-low'));
      expect(onFilterPress).toHaveBeenCalledWith('low');
    });

    it('displays correct account counts', () => {
      render(
        <MappingStatsBar
          {...defaultProps({ totalAccounts: 10, highConfidence: 4, mediumConfidence: 3, lowConfidence: 2, confirmedCount: 7 })}
        />,
      );
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
    });
  });

  describe('Confirmed Names card', () => {
    it('is disabled when no accounts are confirmed yet, regardless of band flags', () => {
      render(<MappingStatsBar {...defaultProps({ confirmedCount: 0, confirmedHigh: false })} />);
      expect(screen.queryByText('View Review')).toBeNull();
      expect(screen.getByText('Click to review')).toBeTruthy();
    });

    it('shows "View Review" badge and enables the card as soon as any account is confirmed — does not require every band to be confirmed', () => {
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedCount: 1, confirmedHigh: false, confirmedMedium: false, confirmedLow: false })}
        />,
      );
      expect(screen.getByText('View Review')).toBeTruthy();
      expect(screen.queryByText('Click to review')).toBeNull();
    });

    it('calls onConfirmedPress when "View Review" card is pressed', () => {
      const onConfirmedPress = jest.fn();
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedCount: 1, onConfirmedPress })}
        />,
      );
      fireEvent.press(screen.getByTestId('stats-bar-confirmed'));
      expect(onConfirmedPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirmedPress when card is disabled (no confirmed accounts)', () => {
      const onConfirmedPress = jest.fn();
      render(<MappingStatsBar {...defaultProps({ confirmedCount: 0, onConfirmedPress })} />);
      fireEvent.press(screen.getByTestId('stats-bar-confirmed'));
      expect(onConfirmedPress).not.toHaveBeenCalled();
    });
  });

  describe('"Confirmed" badge on stat cards', () => {
    it('shows "Confirmed" badge on High card when confirmedHigh is true', () => {
      render(<MappingStatsBar {...defaultProps({ confirmedHigh: true })} />);
      expect(screen.getByText('Confirmed')).toBeTruthy();
    });

    it('does not show "Confirmed" badge on High card when confirmedHigh is false', () => {
      render(<MappingStatsBar {...defaultProps({ confirmedHigh: false })} />);
      expect(screen.queryByText('Confirmed')).toBeNull();
    });
  });

  describe('"Click to review" badge on stat cards', () => {
    it('does not render a review badge on High card when onBandReviewPress is not provided', () => {
      render(<MappingStatsBar {...defaultProps({ confirmedHigh: true })} />);
      expect(screen.queryByTestId('stats-bar-high-review')).toBeNull();
    });

    it('does not render a review badge when band is not confirmed even if onBandReviewPress is provided', () => {
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedHigh: false, onBandReviewPress: jest.fn() })}
        />,
      );
      expect(screen.queryByTestId('stats-bar-high-review')).toBeNull();
    });

    it('renders review badge on High card when confirmed and onBandReviewPress is provided', () => {
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedHigh: true, onBandReviewPress: jest.fn() })}
        />,
      );
      expect(screen.getByTestId('stats-bar-high-review')).toBeTruthy();
    });

    it('calls onBandReviewPress with "high" when High review badge is pressed', () => {
      const onBandReviewPress = jest.fn();
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedHigh: true, onBandReviewPress })}
        />,
      );
      fireEvent.press(screen.getByTestId('stats-bar-high-review'));
      expect(onBandReviewPress).toHaveBeenCalledWith('high');
    });

    it('calls onBandReviewPress with "medium" when Medium review badge is pressed', () => {
      const onBandReviewPress = jest.fn();
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedMedium: true, onBandReviewPress })}
        />,
      );
      fireEvent.press(screen.getByTestId('stats-bar-medium-review'));
      expect(onBandReviewPress).toHaveBeenCalledWith('medium');
    });

    it('calls onBandReviewPress with "low" when Low review badge is pressed', () => {
      const onBandReviewPress = jest.fn();
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedLow: true, onBandReviewPress })}
        />,
      );
      fireEvent.press(screen.getByTestId('stats-bar-low-review'));
      expect(onBandReviewPress).toHaveBeenCalledWith('low');
    });

    it('does not call onFilterPress when the review badge is pressed', () => {
      const onFilterPress = jest.fn();
      const onBandReviewPress = jest.fn();
      render(
        <MappingStatsBar
          {...defaultProps({ confirmedHigh: true, onFilterPress, onBandReviewPress })}
        />,
      );
      fireEvent.press(screen.getByTestId('stats-bar-high-review'));
      expect(onFilterPress).not.toHaveBeenCalled();
      expect(onBandReviewPress).toHaveBeenCalledWith('high');
    });
  });
});
