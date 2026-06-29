import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import type { ProjectScopeMember } from '../../types/project-scope.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// config/theme is not globally mocked; mirror sibling component-test conventions.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    accent: '#003399',
    accentForeground: '#FAFAFA',
    destructive: '#DC2626',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { MemberAddControl } from '../MemberAddControl';

// ─── Helpers ────────────────────────────────────────────────────────────────

// The Select/role menu opens via triggerRef.measureInWindow(callback). The test
// renderer never fires that callback, so patch the host View prototype to invoke
// it synchronously — this is the only way to open the modal-based menu in jest.
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

function pickRole(label: string): void {
  fireEvent.press(screen.getByTestId('mac-role-trigger'));
  fireEvent.press(screen.getByText(label));
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('MemberAddControl', () => {
  it('disables the Add button initially (no email, no role)', () => {
    render(<MemberAddControl testID="mac" onAdd={jest.fn()} />);

    expect(screen.getByTestId('mac-add')).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('does not call onAdd when the disabled Add button is pressed', () => {
    const onAdd = jest.fn();
    render(<MemberAddControl testID="mac" onAdd={onAdd} />);

    fireEvent.press(screen.getByTestId('mac-add'));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('stays disabled with only an email (no role)', () => {
    render(<MemberAddControl testID="mac" onAdd={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('mac-input'), 'jane@company.com');

    expect(screen.getByTestId('mac-add')).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('stays disabled with only a role (no email)', () => {
    render(<MemberAddControl testID="mac" onAdd={jest.fn()} />);

    pickRole('Modifier');

    expect(screen.getByTestId('mac-add')).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('stays disabled when the email has no @', () => {
    render(<MemberAddControl testID="mac" onAdd={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('mac-input'), 'not-an-email');
    pickRole('Modifier');

    expect(screen.getByTestId('mac-add')).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('enables Add once a valid email + role are chosen and emits the member exactly once', () => {
    const onAdd = jest.fn<void, [ProjectScopeMember]>();
    render(<MemberAddControl testID="mac" onAdd={onAdd} />);

    fireEvent.changeText(screen.getByTestId('mac-input'), '  Jane@Company.com  ');
    pickRole('Modifier');

    expect(screen.getByTestId('mac-add')).toHaveProp('accessibilityState', {
      disabled: false,
    });

    fireEvent.press(screen.getByTestId('mac-add'));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith({
      id: 'jane@company.com',
      name: 'Jane',
      email: 'Jane@Company.com',
      role: 'editor',
    });
  });

  it('clears the email + role after a successful add', () => {
    render(<MemberAddControl testID="mac" onAdd={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId('mac-input'), 'jane@company.com');
    pickRole('Modifier');
    fireEvent.press(screen.getByTestId('mac-add'));

    // The testID is on the Input wrapper; the editable TextInput carries the
    // accessibility label, so read the cleared value from there.
    expect(screen.getByLabelText('Member email')).toHaveProp('value', '');
    expect(screen.getByTestId('mac-add')).toHaveProp('accessibilityState', {
      disabled: true,
    });
  });

  it('offers exactly the three scope roles — Admin / Modifier / Viewer — and no others', () => {
    render(<MemberAddControl testID="mac" onAdd={jest.fn()} />);

    fireEvent.press(screen.getByTestId('mac-role-trigger'));

    expect(screen.getByTestId('mac-role-option-admin')).toBeTruthy();
    expect(screen.getByTestId('mac-role-option-editor')).toBeTruthy();
    expect(screen.getByTestId('mac-role-option-viewer')).toBeTruthy();

    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Modifier')).toBeTruthy();
    expect(screen.getByText('Viewer')).toBeTruthy();

    // Raw permission labels must NOT leak into the scope role picker.
    expect(screen.queryByText('Editor')).toBeNull();
    expect(screen.queryByText('Approver')).toBeNull();
    expect(screen.queryByTestId('mac-role-option-approver')).toBeNull();
  });
});
