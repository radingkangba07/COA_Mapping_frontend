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
    destructive: '#DC2626',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { MembersTable } from '../MembersTable';

// ─── Helpers ────────────────────────────────────────────────────────────────

// RolePillSelector opens its menu via measureInWindow(callback); the test
// renderer never fires that callback, so patch the host View prototype.
beforeAll(() => {
  (
    View.prototype as unknown as {
      measureInWindow: (
        cb: (x: number, y: number, w: number, h: number) => void,
      ) => void;
    }
  ).measureInWindow = (cb) => cb(0, 0, 100, 40);
});

const alice: ProjectScopeMember = {
  id: 'alice@example.com',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
};

const bob: ProjectScopeMember = {
  id: 'bob@example.com',
  name: 'Bob',
  email: 'bob@example.com',
  role: 'viewer',
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('MembersTable', () => {
  it('renders the empty state and no rows when there are no members', () => {
    render(
      <MembersTable
        testID="mt"
        members={[]}
        onUpdateRole={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText('No members added yet.')).toBeTruthy();
    expect(screen.queryByTestId('mt-header')).toBeNull();
    expect(screen.queryByTestId(`mt-row-${alice.id}`)).toBeNull();
  });

  it('renders a header and one row per member with name + email', () => {
    render(
      <MembersTable
        testID="mt"
        members={[alice, bob]}
        onUpdateRole={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByTestId('mt-header')).toBeTruthy();
    expect(screen.getByText('Member')).toBeTruthy();
    expect(screen.getByText('Role')).toBeTruthy();
    expect(screen.getByText('Actions')).toBeTruthy();

    expect(screen.getByTestId(`mt-row-${alice.id}`)).toBeTruthy();
    expect(screen.getByTestId(`mt-row-${bob.id}`)).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('bob@example.com')).toBeTruthy();
  });

  it('renders the current role label for each member', () => {
    render(
      <MembersTable
        testID="mt"
        members={[alice, bob]}
        onUpdateRole={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    // SCOPE_MEMBER_ROLES maps admin -> "Admin", viewer -> "Viewer".
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Viewer')).toBeTruthy();
  });

  it('calls onRemove with the member id when the remove button is pressed', () => {
    const onRemove = jest.fn();
    render(
      <MembersTable
        testID="mt"
        members={[alice, bob]}
        onUpdateRole={jest.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByTestId(`mt-remove-${bob.id}`));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(bob.id);
  });

  it('exposes an accessible remove label per member', () => {
    const onRemove = jest.fn();
    render(
      <MembersTable
        testID="mt"
        members={[alice]}
        onUpdateRole={jest.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.press(screen.getByLabelText('Remove Alice'));

    expect(onRemove).toHaveBeenCalledWith(alice.id);
  });

  it('calls onUpdateRole(id, newRole) when a different role is picked from the pill menu', () => {
    const onUpdateRole = jest.fn();
    render(
      <MembersTable
        testID="mt"
        members={[alice]}
        onUpdateRole={onUpdateRole}
        onRemove={jest.fn()}
      />,
    );

    // alice is 'admin'; open her pill and select 'Viewer'.
    fireEvent.press(screen.getByTestId(`mt-role-${alice.id}`));
    fireEvent.press(screen.getByTestId(`mt-role-${alice.id}-option-viewer`));

    expect(onUpdateRole).toHaveBeenCalledTimes(1);
    expect(onUpdateRole).toHaveBeenCalledWith(alice.id, 'viewer');
  });
});
