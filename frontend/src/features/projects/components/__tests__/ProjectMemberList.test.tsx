import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { createProjectId, createUserId } from '@/shared/types/common.types';
import type { AccessResponse } from '../../types/project-access.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const icon =
    (name: string) =>
    (props: Record<string, unknown>) => <View testID={`${name}-icon`} {...props} />;
  return new Proxy(
    { __esModule: true },
    {
      get: (target: Record<string, unknown>, prop: string) =>
        prop in target ? target[prop] : icon(prop),
    },
  );
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

jest.mock('@/config/theme', () => ({
  colors: {
    primaryForeground: '#FAFAFA',
    mutedForeground: '#71717A',
    foreground: '#09090B',
    destructive: '#DC2626',
  },
}));

const mockRevoke = jest.fn();
const defaultHookReturn = {
  members: [] as AccessResponse[],
  isLoading: false,
  canManage: true,
  currentUserId: createUserId('current-user'),
  revoke: mockRevoke,
  isRevoking: false,
};

const mockUseProjectAccess = jest.fn((..._args: unknown[]) => ({ ...defaultHookReturn }));

jest.mock('../../hooks/useProjectAccess', () => ({
  useProjectAccess: (...args: unknown[]) => mockUseProjectAccess(...args),
}));

const mockConfirm = jest.fn();
jest.mock('@/shared/hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm: mockConfirm }),
}));

jest.mock('../MemberBadge', () => ({
  MemberBadge: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={props.testID as string} />;
  },
}));

jest.mock('../AddMemberDialog', () => ({
  AddMemberDialog: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={props.testID as string} />;
  },
}));

jest.mock('@/shared/components/ui/Card', () => {
  const { View, Text } = require('react-native');
  const CardBase = ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
    <View testID={testID}>{children}</View>
  );
  CardBase.Header = ({ children, ...props }: Record<string, unknown>) => (
    <View {...props}>{children as React.ReactNode}</View>
  );
  CardBase.Title = ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>;
  CardBase.Content = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  return { Card: CardBase };
});

jest.mock('@/shared/components/ui/Button', () => ({
  Button: ({ children, testID, onPress }: Record<string, unknown>) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable testID={testID as string} onPress={onPress as () => void}>
        {children as React.ReactNode}
      </Pressable>
    );
  },
}));

jest.mock('@/shared/components/ui/Badge', () => ({
  Badge: ({ children, testID }: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID as string}>
        <Text>{children as React.ReactNode}</Text>
      </View>
    );
  },
}));

jest.mock('@/shared/components/ui/Spinner', () => ({
  Spinner: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={props.testID as string} />;
  },
}));

jest.mock('@/shared/components/feedback/EmptyState', () => ({
  EmptyState: (props: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID as string}>
        <Text>{props.title as string}</Text>
      </View>
    );
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { ProjectMemberList } from '../ProjectMemberList';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROJECT_ID = createProjectId('p1');

const makeMember = (id: string, name: string): AccessResponse => ({
  userId: createUserId(id),
  name,
  email: `${id}@test.com`,
  permission: 'editor',
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProjectMemberList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectAccess.mockReturnValue({ ...defaultHookReturn });
  });

  it('renders member rows', () => {
    const members = [makeMember('u1', 'Alice'), makeMember('u2', 'Bob')];
    mockUseProjectAccess.mockReturnValue({ ...defaultHookReturn, members });

    render(<ProjectMemberList projectId={PROJECT_ID} />);

    expect(screen.getByTestId('project-member-list-row-u1')).toBeTruthy();
    expect(screen.getByTestId('project-member-list-row-u2')).toBeTruthy();
  });

  it('hides remove button for current user row', () => {
    const members = [makeMember('current-user', 'Me'), makeMember('u2', 'Other')];
    mockUseProjectAccess.mockReturnValue({ ...defaultHookReturn, members });

    render(<ProjectMemberList projectId={PROJECT_ID} />);

    expect(screen.queryByTestId('project-member-list-remove-current-user')).toBeNull();
    expect(screen.getByTestId('project-member-list-remove-u2')).toBeTruthy();
  });

  it('hides add member button when canManage is false', () => {
    mockUseProjectAccess.mockReturnValue({ ...defaultHookReturn, canManage: false });

    render(<ProjectMemberList projectId={PROJECT_ID} />);

    expect(screen.queryByTestId('project-member-list-add-btn')).toBeNull();
  });

  it('shows add member button when canManage is true', () => {
    render(<ProjectMemberList projectId={PROJECT_ID} />);

    expect(screen.getByTestId('project-member-list-add-btn')).toBeTruthy();
  });

  it('calls revoke on confirm', async () => {
    const members = [makeMember('u1', 'Alice')];
    mockUseProjectAccess.mockReturnValue({ ...defaultHookReturn, members });
    mockConfirm.mockResolvedValue(true);

    render(<ProjectMemberList projectId={PROJECT_ID} />);

    fireEvent.press(screen.getByTestId('project-member-list-remove-u1'));

    await waitFor(() => {
      expect(mockRevoke).toHaveBeenCalledWith(createUserId('u1'));
    });
  });

  it('does not call revoke when confirm is cancelled', async () => {
    const members = [makeMember('u1', 'Alice')];
    mockUseProjectAccess.mockReturnValue({ ...defaultHookReturn, members });
    mockConfirm.mockResolvedValue(false);

    render(<ProjectMemberList projectId={PROJECT_ID} />);

    fireEvent.press(screen.getByTestId('project-member-list-remove-u1'));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    expect(mockRevoke).not.toHaveBeenCalled();
  });
});
