import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { SidebarContentProps } from '../sidebar.types';

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
  colors: { primaryForeground: '#FAFAFA', mutedForeground: '#71717A', foreground: '#09090B' },
}));

// ─── useProjectAccess mock ──────────────────────────────────────────────────

const mockUseProjectAccess = jest.fn((..._args: unknown[]) => ({
  members: [],
  isLoading: false,
  error: null,
  canManage: false,
  currentUserId: null,
  grant: jest.fn(),
  grantAsync: jest.fn(),
  isGranting: false,
}));

jest.mock('@/features/projects/hooks/useProjectAccess', () => ({
  useProjectAccess: (...args: unknown[]) => mockUseProjectAccess(...args),
}));

// ─── AddMemberDialog mock ───────────────────────────────────────────────────

interface CapturedDialogProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  testID?: string;
}

let capturedDialogProps: Partial<CapturedDialogProps> = {};

jest.mock('@/features/projects/components/AddMemberDialog', () => {
  const { View } = require('react-native');
  return {
    AddMemberDialog: (props: CapturedDialogProps) => {
      capturedDialogProps = props;
      return <View testID="sidebar-add-member-dialog" />;
    },
  };
});

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { SidebarContent } from '../SidebarContent';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockAccessReturn(overrides: Partial<ReturnType<typeof mockUseProjectAccess>> = {}) {
  return {
    members: [],
    isLoading: false,
    error: null,
    canManage: false,
    currentUserId: null,
    grant: jest.fn(),
    grantAsync: jest.fn(),
    isGranting: false,
    ...overrides,
  };
}

const BASE_PROPS: SidebarContentProps = {
  projectId: null,
  projectName: 'Test Project',
  sourceERP: null,
  targetERP: null,
  currentUser: null,
  testID: 'sidebar-content',
};

function renderSidebar(overrides: Partial<SidebarContentProps> = {}) {
  return render(<SidebarContent {...BASE_PROPS} {...overrides} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SidebarContent — Invite flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedDialogProps = {};
    mockUseProjectAccess.mockReturnValue(mockAccessReturn());
  });

  it('does NOT render the invite button when projectId is null', () => {
    renderSidebar({ projectId: null });

    expect(screen.queryByTestId('sidebar-invite-btn')).toBeNull();
  });

  it('does NOT render the invite button when canManage is false', () => {
    mockUseProjectAccess.mockReturnValue(mockAccessReturn({ canManage: false }));

    renderSidebar({ projectId: 'proj-123' });

    expect(screen.queryByTestId('sidebar-invite-btn')).toBeNull();
  });

  it('renders the invite button when projectId is set and canManage is true', () => {
    mockUseProjectAccess.mockReturnValue(mockAccessReturn({ canManage: true }));

    renderSidebar({ projectId: 'proj-123' });

    expect(screen.getByTestId('sidebar-invite-btn')).toBeTruthy();
  });

  it('opens AddMemberDialog when the invite button is pressed', () => {
    mockUseProjectAccess.mockReturnValue(mockAccessReturn({ canManage: true }));

    renderSidebar({ projectId: 'proj-123' });

    // Dialog should start closed
    expect(capturedDialogProps.visible).toBe(false);

    fireEvent.press(screen.getByTestId('sidebar-invite-btn'));

    // After press, dialog should receive visible=true
    expect(capturedDialogProps.visible).toBe(true);
  });
});
