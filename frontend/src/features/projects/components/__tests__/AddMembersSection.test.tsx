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
import { AddMembersSection } from '../AddMembersSection';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Role menus (Select + RolePillSelector) open via measureInWindow(callback);
// the test renderer never fires it, so patch the host View prototype.
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

// ─── Tests ────────────────────────────────────────────────────────────────

describe('AddMembersSection', () => {
  it('renders the add control and the empty members table when there are no members', () => {
    render(
      <AddMembersSection
        testID="ams"
        members={[]}
        onAddMember={jest.fn()}
        onUpdateMemberRole={jest.fn()}
        onRemoveMember={jest.fn()}
      />,
    );

    expect(screen.getByTestId('ams-control')).toBeTruthy();
    expect(screen.getByTestId('ams-control-add')).toBeTruthy();
    expect(screen.getByTestId('ams-table')).toBeTruthy();
    expect(screen.getByText('No members added yet.')).toBeTruthy();
  });

  it('renders a row per member from the members prop', () => {
    render(
      <AddMembersSection
        testID="ams"
        members={[alice]}
        onAddMember={jest.fn()}
        onUpdateMemberRole={jest.fn()}
        onRemoveMember={jest.fn()}
      />,
    );

    expect(screen.getByTestId(`ams-table-row-${alice.id}`)).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('No members added yet.')).toBeNull();
  });

  it('forwards a row remove press to onRemoveMember with the member id', () => {
    const onRemoveMember = jest.fn();
    render(
      <AddMembersSection
        testID="ams"
        members={[alice]}
        onAddMember={jest.fn()}
        onUpdateMemberRole={jest.fn()}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.press(screen.getByTestId(`ams-table-remove-${alice.id}`));

    expect(onRemoveMember).toHaveBeenCalledTimes(1);
    expect(onRemoveMember).toHaveBeenCalledWith(alice.id);
  });

  it('forwards the add flow to onAddMember with the composed member', () => {
    const onAddMember = jest.fn<void, [ProjectScopeMember]>();
    render(
      <AddMembersSection
        testID="ams"
        members={[]}
        onAddMember={onAddMember}
        onUpdateMemberRole={jest.fn()}
        onRemoveMember={jest.fn()}
      />,
    );

    fireEvent.changeText(
      screen.getByTestId('ams-control-input'),
      'jane@company.com',
    );
    fireEvent.press(screen.getByTestId('ams-control-role-trigger'));
    fireEvent.press(screen.getByTestId('ams-control-role-option-editor'));
    fireEvent.press(screen.getByTestId('ams-control-add'));

    expect(onAddMember).toHaveBeenCalledTimes(1);
    expect(onAddMember).toHaveBeenCalledWith({
      id: 'jane@company.com',
      name: 'jane',
      email: 'jane@company.com',
      role: 'editor',
    });
  });
});
