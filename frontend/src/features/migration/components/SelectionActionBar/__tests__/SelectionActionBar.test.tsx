import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SelectionActionBar } from '../SelectionActionBar';

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

jest.mock('@/shared/components/ui/Button', () => {
  const RN = require('react-native');
  const R = require('react');
  return {
    Button: ({ children, onPress, testID, accessibilityLabel }: {
      children: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      accessibilityLabel?: string;
    }) =>
      R.createElement(
        RN.TouchableOpacity,
        { onPress, testID, accessibilityLabel },
        children,
      ),
  };
});

jest.mock('@/config/theme', () => ({
  colors: { foreground: '#000000' },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SelectionActionBar', () => {
  const onDelete = jest.fn();
  const onClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when count is 0', () => {
    const { toJSON } = render(
      <SelectionActionBar count={0} onDelete={onDelete} onClear={onClear} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('shows singular label for count of 1', () => {
    render(<SelectionActionBar count={1} onDelete={onDelete} onClear={onClear} />);
    expect(screen.getByText('1 account selected')).toBeTruthy();
  });

  it('shows plural label for count greater than 1', () => {
    render(<SelectionActionBar count={5} onDelete={onDelete} onClear={onClear} />);
    expect(screen.getByText('5 accounts selected')).toBeTruthy();
  });

  it('calls onClear when the Clear button is pressed', () => {
    render(
      <SelectionActionBar
        count={3}
        onDelete={onDelete}
        onClear={onClear}
        testID="action-bar"
      />,
    );
    fireEvent.press(screen.getByTestId('action-bar-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('applies testID to the root container', () => {
    render(
      <SelectionActionBar count={2} onDelete={onDelete} onClear={onClear} testID="sel-bar" />,
    );
    expect(screen.getByTestId('sel-bar')).toBeTruthy();
  });

  it('does not render a delete button', () => {
    render(
      <SelectionActionBar count={2} onDelete={onDelete} onClear={onClear} testID="sel-bar" />,
    );
    expect(screen.queryByTestId('sel-bar-delete')).toBeNull();
    expect(screen.queryByText('Delete selected')).toBeNull();
  });

  it('renders without testID without crashing', () => {
    const { toJSON } = render(
      <SelectionActionBar count={1} onDelete={onDelete} onClear={onClear} />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
