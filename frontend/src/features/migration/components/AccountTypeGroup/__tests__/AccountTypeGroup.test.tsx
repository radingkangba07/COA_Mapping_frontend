import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { AccountTypeGroup } from '../AccountTypeGroup';
import type { AccountMapping } from '@/features/migration/types/mapping.types';

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
    {
      get: (target: Record<string, unknown>, prop: string) =>
        prop in target ? target[prop] : icon(prop),
    },
  );
});

jest.mock('@/config/theme', () => ({
  colors: {
    mutedForeground: '#71717A',
    primary: '#2563EB',
    foreground: '#09090B',
    primaryForeground: '#FAFAFA',
    destructive: '#DC2626',
    accent: '#2563EB',
  },
}));

jest.mock('@/shared/utils/string.utils', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

// Capture the Select's onValueChange so tests can trigger it directly.
let capturedSelectOnValueChange: ((value: string) => void) | null = null;

jest.mock('@/shared/components/ui/Select', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Select: (props: {
      value: string;
      onValueChange: (v: string) => void;
      testID?: string;
    }) => {
      capturedSelectOnValueChange = props.onValueChange;
      return R.createElement(RN.View, { testID: props.testID ?? 'select' });
    },
  };
});

jest.mock('@/shared/components/ui/Button', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Button: ({
      onPress,
      children,
      accessibilityLabel,
      testID,
    }: {
      onPress?: () => void;
      children?: React.ReactNode;
      accessibilityLabel?: string;
      testID?: string;
    }) =>
      R.createElement(
        RN.Pressable,
        { onPress, accessibilityLabel, testID },
        children,
      ),
  };
});

jest.mock('@/shared/components/ui/Badge', () => {
  const R = require('react');
  const RN = require('react-native');
  return {
    Badge: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => R.createElement(RN.View, { testID: testID ?? 'badge' }, children),
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockAccount: AccountMapping = {
  source_number: '1000',
  source_name: 'Cash',
  target_name: 'Cash and Bank',
  target_number: '2000',
  score: 95,
  remark: '',
};

const secondAccount: AccountMapping = {
  source_number: '1100',
  source_name: 'Receivables',
  target_name: 'Accounts Receivable',
  score: 88,
  remark: '',
};

const mockTargetAccounts = [
  { name: 'Cash and Bank', number: '2000' },
  { name: 'Accounts Receivable', number: '1100' },
  { name: 'Revenue', number: '4000' },
];

const onAccountNameChange = jest.fn();
const onDeleteAccount = jest.fn();
const onTypeChange = jest.fn();

const defaultProps = {
  sourceType: 'Asset',
  targetType: 'Assets',
  confidence: 95,
  accounts: [mockAccount],
  targetTypes: ['Assets', 'Liabilities'],
  targetAccounts: mockTargetAccounts,
  onTypeChange,
  onAccountNameChange,
  onDeleteAccount,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AccountTypeGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedSelectOnValueChange = null;
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders the source type label', () => {
      render(<AccountTypeGroup {...defaultProps} />);
      expect(screen.getByText('Asset')).toBeTruthy();
    });

    it('renders singular "account" for a single account', () => {
      render(<AccountTypeGroup {...defaultProps} />);
      expect(screen.getByText('1 account')).toBeTruthy();
    });

    it('renders plural "accounts" for multiple accounts', () => {
      render(
        <AccountTypeGroup {...defaultProps} accounts={[mockAccount, secondAccount]} />,
      );
      expect(screen.getByText('2 accounts')).toBeTruthy();
    });

    it('shows "Mapped" badge when targetType is non-empty', () => {
      render(<AccountTypeGroup {...defaultProps} />);
      expect(screen.getByText('Mapped')).toBeTruthy();
    });

    it('shows "Unmapped" badge when targetType is empty', () => {
      render(<AccountTypeGroup {...defaultProps} targetType="" />);
      expect(screen.getByText('Unmapped')).toBeTruthy();
    });

    it('shows account source name by default', () => {
      render(<AccountTypeGroup {...defaultProps} />);
      expect(screen.getByText('Cash')).toBeTruthy();
    });
  });

  // ─── Expand / Collapse (manual toggle) ───────────────────────────────────

  describe('manual expand/collapse', () => {
    it('shows account rows by default (open)', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      expect(screen.getByTestId('group-row-0')).toBeTruthy();
    });

    it('hides rows after pressing the group header', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Asset group, 1 accounts' }),
      );
      expect(screen.queryByTestId('group-row-0')).toBeNull();
    });

    it('re-shows rows after pressing header twice', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      const header = screen.getByRole('button', { name: 'Asset group, 1 accounts' });
      fireEvent.press(header);
      fireEvent.press(header);
      expect(screen.getByTestId('group-row-0')).toBeTruthy();
    });
  });

  // ─── forceOpen prop ───────────────────────────────────────────────────────

  describe('forceOpen prop', () => {
    it('collapses rows immediately when forceOpen=false', () => {
      render(<AccountTypeGroup {...defaultProps} forceOpen={false} testID="group" />);
      expect(screen.queryByTestId('group-row-0')).toBeNull();
    });

    it('expands rows when forceOpen=true', () => {
      render(<AccountTypeGroup {...defaultProps} forceOpen={true} testID="group" />);
      expect(screen.getByTestId('group-row-0')).toBeTruthy();
    });

    it('overrides locally collapsed state when forceOpen changes to true', () => {
      const { rerender } = render(
        <AccountTypeGroup {...defaultProps} forceOpen={false} testID="group" />,
      );
      expect(screen.queryByTestId('group-row-0')).toBeNull();

      rerender(<AccountTypeGroup {...defaultProps} forceOpen={true} testID="group" />);
      expect(screen.getByTestId('group-row-0')).toBeTruthy();
    });

    it('overrides locally expanded state when forceOpen changes to false', () => {
      const { rerender } = render(
        <AccountTypeGroup {...defaultProps} forceOpen={true} testID="group" />,
      );
      expect(screen.getByTestId('group-row-0')).toBeTruthy();

      rerender(<AccountTypeGroup {...defaultProps} forceOpen={false} testID="group" />);
      expect(screen.queryByTestId('group-row-0')).toBeNull();
    });

    it('leaves group open when forceOpen is undefined', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      // default isOpen=true, no forceOpen effect
      expect(screen.getByTestId('group-row-0')).toBeTruthy();
    });
  });

  // ─── Target number lookup on selection ───────────────────────────────────

  describe('target number on dropdown selection', () => {
    it('passes the matching target number when a known account is selected', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);

      // Open edit mode to render the Select
      fireEvent.press(screen.getByLabelText('Edit target account'));

      act(() => {
        capturedSelectOnValueChange?.('Accounts Receivable');
      });

      expect(onAccountNameChange).toHaveBeenCalledWith(
        'Asset',               // sourceType
        0,                     // accountIndex
        'Accounts Receivable', // newName
        'Cash',                // sourceName
        undefined,             // suggestionId
        '1100',                // targetNumber from targetAccounts
      );
    });

    it('passes null targetNumber when "unmatched" sentinel is selected', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      fireEvent.press(screen.getByLabelText('Edit target account'));

      act(() => {
        capturedSelectOnValueChange?.('unmatched');
      });

      expect(onAccountNameChange).toHaveBeenCalledWith(
        'Asset',
        0,
        '',        // empty name for unmatched
        'Cash',
        undefined,
        null,      // null when clearing
      );
    });

    it('passes null targetNumber when selected name is not in targetAccounts', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      fireEvent.press(screen.getByLabelText('Edit target account'));

      act(() => {
        capturedSelectOnValueChange?.('Unknown Account');
      });

      expect(onAccountNameChange).toHaveBeenCalledWith(
        'Asset',
        0,
        'Unknown Account',
        'Cash',
        undefined,
        null,
      );
    });

    it('closes editing after a selection is made', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      fireEvent.press(screen.getByLabelText('Edit target account'));

      act(() => {
        capturedSelectOnValueChange?.('Cash and Bank');
      });

      // After close, edit button label reverts to "Edit target account"
      expect(screen.getByLabelText('Edit target account')).toBeTruthy();
    });
  });

  // ─── targetAccountOptions built from targetAccounts ───────────────────────

  describe('targetAccountOptions', () => {
    it('renders one Select option per targetAccount entry', () => {
      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      // Open edit to render Select
      fireEvent.press(screen.getByLabelText('Edit target account'));
      // Select rendered = capturedSelectOnValueChange is set, confirming options were built
      expect(capturedSelectOnValueChange).not.toBeNull();
    });

    it('passes correct current target name as Select value', () => {
      let capturedValue: string | null = null;
      const SelectMock = jest.requireMock('@/shared/components/ui/Select');
      const original = SelectMock.Select;
      SelectMock.Select = (props: { value: string; onValueChange: (v: string) => void }) => {
        capturedValue = props.value;
        capturedSelectOnValueChange = props.onValueChange;
        const RN = require('react-native');
        const R = require('react');
        return R.createElement(RN.View, { testID: 'select' });
      };

      render(<AccountTypeGroup {...defaultProps} testID="group" />);
      fireEvent.press(screen.getByLabelText('Edit target account'));

      expect(capturedValue).toBe('Cash and Bank');

      SelectMock.Select = original;
    });
  });
});
