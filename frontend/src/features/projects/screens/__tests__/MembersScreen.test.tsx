import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { AppError } from '@/shared/types/result.types';
import type { OrgMember, OrgInvitation, OrgRole } from '../../types/org.types';
import type { OrgId, UserId } from '@/shared/types/common.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) => (
      <View {...props}>{children as React.ReactNode}</View>
    ),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const icon =
    (name: string) =>
    (props: Record<string, unknown>) => <View testID={`${name}-icon`} {...props} />;
  return {
    X: icon('X'),
    __esModule: true,
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

jest.mock('@/config/theme', () => ({
  colors: { destructive: '#DC2626', primaryForeground: '#FAFAFA' },
}));

jest.mock('@/shared/utils/date.utils', () => ({
  formatDate: (d: string) => d,
}));

// ─── ViewModel + Store Mocks ────────────────────────────────────────────────

const mockInvite = jest.fn();
const mockRemove = jest.fn();
const mockCancelInvitation = jest.fn();
const mockRefetch = jest.fn();
const mockSetActiveOrg = jest.fn();

const OWNER_ID = 'user-owner' as UserId;
const MEMBER_ID = 'user-member' as UserId;
const ORG_ID = 'org-1' as OrgId;

const ownerMember: OrgMember = {
  userId: OWNER_ID,
  email: 'owner@test.com',
  name: 'Owner User',
  role: 'owner',
  joinedAt: '2024-01-01',
};

const regularMember: OrgMember = {
  userId: MEMBER_ID,
  email: 'member@test.com',
  name: 'Regular User',
  role: 'member',
  joinedAt: '2024-01-02',
};

const pendingInvitation: OrgInvitation = {
  id: 'inv-1',
  email: 'pending@test.com',
  role: 'member',
  sentAt: '2024-03-01',
  expiresAt: '2024-03-08',
};

interface MembersViewModelReturn {
  members: OrgMember[];
  invitations: OrgInvitation[];
  isOwner: boolean;
  isLoading: boolean;
  error: AppError | null;
  invite: jest.Mock;
  remove: jest.Mock;
  cancelInvitation: jest.Mock;
  isInviting: boolean;
  isRemoving: boolean;
  isCancelling: boolean;
}

const defaultMembersVM: MembersViewModelReturn = {
  members: [ownerMember, regularMember],
  invitations: [pendingInvitation],
  isOwner: true,
  isLoading: false,
  error: null,
  invite: mockInvite,
  remove: mockRemove,
  cancelInvitation: mockCancelInvitation,
  isInviting: false,
  isRemoving: false,
  isCancelling: false,
};

const mockUseMembersViewModel = jest.fn(() => ({ ...defaultMembersVM }));

jest.mock('../../hooks/useMembersViewModel', () => ({
  useMembersViewModel: () => mockUseMembersViewModel(),
}));

const defaultOrgsVM = {
  orgs: [],
  activeOrg: { id: ORG_ID, name: 'Test Org', role: 'owner' as OrgRole, createdAt: '2024-01-01' },
  activeOrgId: ORG_ID,
  isLoading: false,
  error: null,
  setActiveOrg: mockSetActiveOrg,
  refetch: mockRefetch,
};

const mockUseOrgsViewModel = jest.fn(() => ({ ...defaultOrgsVM }));

jest.mock('../../hooks/useOrgsViewModel', () => ({
  useOrgsViewModel: () => mockUseOrgsViewModel(),
}));

const mockUser = { userId: OWNER_ID, name: 'Owner User', email: 'owner@test.com' };

jest.mock('@/features/auth/store/auth.store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: mockUser }),
}));

jest.mock('@/features/auth/store/auth.selectors', () => ({
  selectUser: (s: Record<string, unknown>) => s.user,
}));

jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('@/shared/hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirm: jest.fn(),
    isVisible: false,
    confirmOptions: null,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }),
}));

// ─── Child Component Mocks ──────────────────────────────────────────────────

jest.mock('../../components/InviteMemberDialog', () => ({
  InviteMemberDialog: (props: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID as string}>
        {props.visible ? <Text testID="invite-dialog-content">Dialog Open</Text> : null}
      </View>
    );
  },
}));

jest.mock('@/shared/components/feedback/NetworkErrorFallback', () => ({
  NetworkErrorFallback: (props: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="network-error">
        <Text>Network Error</Text>
      </View>
    );
  },
}));

jest.mock('@/shared/components/feedback/EmptyState', () => ({
  EmptyState: (props: Record<string, unknown>) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID as string}>
        <Text>{props.title as string}</Text>
        <Text>{props.description as string}</Text>
      </View>
    );
  },
}));

jest.mock('@/shared/components/ui/Skeleton', () => ({
  Skeleton: (props: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID="skeleton" {...props} />;
  },
}));

// ─── Import (after mocks) ──────────────────────────────────────────────────

import { MembersScreen } from '../MembersScreen';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MembersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMembersViewModel.mockReturnValue({ ...defaultMembersVM });
    mockUseOrgsViewModel.mockReturnValue({ ...defaultOrgsVM });
  });

  // ── Basic rendering ────────────────────────────────────────────────────

  it('renders the screen with testID', () => {
    render(<MembersScreen />);
    expect(screen.getByTestId('members-screen')).toBeTruthy();
  });

  it('renders Members heading', () => {
    render(<MembersScreen />);
    expect(screen.getByText('Members')).toBeTruthy();
  });

  // ── Owner view ─────────────────────────────────────────────────────────

  describe('owner view', () => {
    it('shows the Invite button', () => {
      render(<MembersScreen />);
      expect(screen.getByTestId('invite-member-btn')).toBeTruthy();
    });

    it('renders remove button for non-self members', () => {
      render(<MembersScreen />);
      expect(screen.getByTestId(`remove-member-${MEMBER_ID}`)).toBeTruthy();
    });

    it('does NOT render remove button for the current user (self)', () => {
      render(<MembersScreen />);
      expect(screen.queryByTestId(`remove-member-${OWNER_ID}`)).toBeNull();
    });

    it('renders the Pending Invitations section', () => {
      render(<MembersScreen />);
      expect(screen.getByText('Pending Invitations')).toBeTruthy();
    });

    it('renders invitation rows with cancel button', () => {
      render(<MembersScreen />);
      expect(screen.getByText('pending@test.com')).toBeTruthy();
      expect(screen.getByTestId('cancel-invite-inv-1')).toBeTruthy();
    });

    it('hides Pending Invitations section when invitations list is empty', () => {
      mockUseMembersViewModel.mockReturnValue({
        ...defaultMembersVM,
        invitations: [],
      });
      render(<MembersScreen />);
      expect(screen.queryByText('Pending Invitations')).toBeNull();
    });
  });

  // ── Non-owner view ─────────────────────────────────────────────────────

  describe('non-owner view', () => {
    beforeEach(() => {
      mockUseMembersViewModel.mockReturnValue({
        ...defaultMembersVM,
        isOwner: false,
        invitations: [],
      });
    });

    it('does NOT show the Invite button', () => {
      render(<MembersScreen />);
      expect(screen.queryByTestId('invite-member-btn')).toBeNull();
    });

    it('does NOT show any remove buttons', () => {
      render(<MembersScreen />);
      expect(screen.queryByTestId(`remove-member-${OWNER_ID}`)).toBeNull();
      expect(screen.queryByTestId(`remove-member-${MEMBER_ID}`)).toBeNull();
    });

    it('does NOT show the Pending Invitations section', () => {
      render(<MembersScreen />);
      expect(screen.queryByText('Pending Invitations')).toBeNull();
    });

    it('still renders member names and roles', () => {
      render(<MembersScreen />);
      expect(screen.getByText('Owner User')).toBeTruthy();
      expect(screen.getByText('Regular User')).toBeTruthy();
      expect(screen.getByTestId(`member-role-${OWNER_ID}`)).toBeTruthy();
      expect(screen.getByTestId(`member-role-${MEMBER_ID}`)).toBeTruthy();
    });
  });

  // ── Loading state ──────────────────────────────────────────────────────

  it('shows skeleton rows when loading', () => {
    mockUseMembersViewModel.mockReturnValue({
      ...defaultMembersVM,
      isLoading: true,
      members: [],
      invitations: [],
    });
    render(<MembersScreen />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(3);
  });

  // ── Error state ────────────────────────────────────────────────────────

  it('shows error fallback when error exists and no members', () => {
    mockUseMembersViewModel.mockReturnValue({
      ...defaultMembersVM,
      error: { code: 'NETWORK', message: 'Connection failed' } as AppError,
      members: [],
      invitations: [],
    });
    render(<MembersScreen />);
    expect(screen.getByTestId('network-error')).toBeTruthy();
  });

  it('shows member list when error exists but members are present', () => {
    mockUseMembersViewModel.mockReturnValue({
      ...defaultMembersVM,
      error: { code: 'NETWORK', message: 'Stale error' } as AppError,
    });
    render(<MembersScreen />);
    expect(screen.getByText('Owner User')).toBeTruthy();
    expect(screen.getByText('Regular User')).toBeTruthy();
    expect(screen.queryByTestId('network-error')).toBeNull();
  });

  it('shows skeleton when loading even with existing members', () => {
    mockUseMembersViewModel.mockReturnValue({
      ...defaultMembersVM,
      isLoading: true,
    });
    render(<MembersScreen />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Owner User')).toBeNull();
  });

  // ── Empty state ────────────────────────────────────────────────────────

  it('shows empty state when no members and not loading', () => {
    mockUseMembersViewModel.mockReturnValue({
      ...defaultMembersVM,
      members: [],
      invitations: [],
    });
    render(<MembersScreen />);
    expect(screen.getByTestId('members-empty')).toBeTruthy();
    expect(screen.getByText('No members yet')).toBeTruthy();
  });

  // ── InviteMemberDialog ─────────────────────────────────────────────────

  it('renders InviteMemberDialog container', () => {
    render(<MembersScreen />);
    expect(screen.getByTestId('invite-dialog')).toBeTruthy();
  });
});
