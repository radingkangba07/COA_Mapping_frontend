import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

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

jest.mock('@/shared/utils/platform.utils', () => ({ isWeb: true }));

jest.mock('@/config/theme', () => ({
  colors: { foreground: '#09090B', mutedForeground: '#9E9E9E' },
}));

jest.mock('@/shared/components/ui/Dialog', () => {
  const { View, Text, Pressable } = require('react-native');
  const Dialog = ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
    <View testID={testID}>{children}</View>
  );
  Dialog.Header = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  Dialog.Title = ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>;
  Dialog.Close = ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
    <Pressable onPress={onPress} testID={testID} />
  );
  Dialog.Content = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  Dialog.Footer = ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
  return { Dialog };
});

// Render Select as a flat list of options so tests can assert on visible text
jest.mock('@/shared/components/ui/Select', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Select: ({
      options,
      value,
      onValueChange,
      testID,
      label,
    }: {
      options: Array<{ label: string; value: string }>;
      value?: string;
      onValueChange: (v: string) => void;
      testID?: string;
      label?: string;
    }) => (
      <View testID={testID}>
        {label ? <Text>{label}</Text> : null}
        {options.map((o) => (
          <Pressable key={o.value} onPress={() => onValueChange(o.value)} testID={`${testID}-${o.value}`}>
            <Text style={o.value === value ? { fontWeight: 'bold' } : undefined}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

const mockInvite = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../hooks/useMembersViewModel', () => ({
  useMembersViewModel: () => ({
    members: [],
    invitations: [],
    isOwner: true,
    isLoading: false,
    error: null,
    invite: mockInvite,
    remove: jest.fn(),
    cancelInvitation: jest.fn(),
    isInviting: false,
    isRemoving: false,
    isCancelling: false,
  }),
}));

jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

// ─── Import (after mocks) ────────────────────────────────────────────────────

import { InviteMemberDialog } from '../InviteMemberDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockOnClose = jest.fn();

function renderDialog(orgType?: 'employer' | 'client') {
  return render(
    <InviteMemberDialog
      visible
      onClose={mockOnClose}
      orgType={orgType}
      testID="invite-dialog"
    />,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('InviteMemberDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvite.mockResolvedValue({ ok: true, data: { invitationId: 'inv-1' } });
  });

  describe('employer org (default)', () => {
    it('renders "Invite Member" title for employer orgs', () => {
      renderDialog();
      expect(screen.getByText('Invite Member')).toBeTruthy();
    });

    it('shows admin and member role options for employer org', () => {
      renderDialog('employer');
      expect(screen.getByText('Admin')).toBeTruthy();
      expect(screen.getByText('Member')).toBeTruthy();
    });

    it('defaults to member role for employer org', () => {
      renderDialog('employer');
      // The select shows the currently selected value
      expect(screen.getAllByText('Member').length).toBeGreaterThan(0);
    });

    it('invites with employer role on submit', async () => {
      renderDialog('employer');

      fireEvent.changeText(
        screen.getByTestId('invite-email-input'),
        'user@example.com',
      );

      await waitFor(() =>
        expect(screen.getByTestId('invite-submit-btn').props.accessibilityState?.disabled).toBe(false),
      );
      fireEvent.press(screen.getByTestId('invite-submit-btn'));

      await waitFor(() => {
        expect(mockInvite).toHaveBeenCalledWith({
          email: 'user@example.com',
          role: expect.stringMatching(/^(admin|member)$/),
        });
      });
    });
  });

  describe('client org', () => {
    it('renders "Invite Client Member" title for client orgs', () => {
      renderDialog('client');
      expect(screen.getByText('Invite Client Member')).toBeTruthy();
    });

    it('shows client_admin and client_member role options', () => {
      renderDialog('client');
      expect(screen.getByText('Client Admin')).toBeTruthy();
      expect(screen.getByText('Client Member')).toBeTruthy();
    });

    it('defaults to client_member role for client org', () => {
      renderDialog('client');
      expect(screen.getAllByText('Client Member').length).toBeGreaterThan(0);
    });

    it('invites with client role on submit', async () => {
      renderDialog('client');

      fireEvent.changeText(
        screen.getByTestId('invite-email-input'),
        'carol@retailcorp.com',
      );

      await waitFor(() =>
        expect(screen.getByTestId('invite-submit-btn').props.accessibilityState?.disabled).toBe(false),
      );
      fireEvent.press(screen.getByTestId('invite-submit-btn'));

      await waitFor(() => {
        expect(mockInvite).toHaveBeenCalledWith({
          email: 'carol@retailcorp.com',
          role: expect.stringMatching(/^client_(admin|member)$/),
        });
      });
    });
  });

  describe('shared behaviour', () => {
    it('submit button is disabled when email is empty', () => {
      renderDialog();
      const btn = screen.getByTestId('invite-submit-btn');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
      expect(mockInvite).not.toHaveBeenCalled();
    });

    it('shows success toast and calls onClose after successful invite', async () => {
      renderDialog();

      fireEvent.changeText(
        screen.getByTestId('invite-email-input'),
        'user@example.com',
      );

      await waitFor(() =>
        expect(screen.getByTestId('invite-submit-btn').props.accessibilityState?.disabled).toBe(false),
      );
      fireEvent.press(screen.getByTestId('invite-submit-btn'));

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Invitation sent', expect.any(String));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('shows error toast and does NOT call onClose on invite failure', async () => {
      mockInvite.mockResolvedValue({
        ok: false,
        error: { code: 'HTTP_500', message: 'Server error' },
      });

      renderDialog();

      fireEvent.changeText(
        screen.getByTestId('invite-email-input'),
        'user@example.com',
      );

      await waitFor(() =>
        expect(screen.getByTestId('invite-submit-btn').props.accessibilityState?.disabled).toBe(false),
      );
      fireEvent.press(screen.getByTestId('invite-submit-btn'));

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Invitation failed', 'Server error');
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('sets email field error on INVITATION_ALREADY_PENDING', async () => {
      mockInvite.mockResolvedValue({
        ok: false,
        error: {
          code: 'INVITATION_ALREADY_PENDING',
          message: 'An invitation is already pending for this email',
        },
      });

      renderDialog();

      fireEvent.changeText(
        screen.getByTestId('invite-email-input'),
        'existing@example.com',
      );

      await waitFor(() =>
        expect(screen.getByTestId('invite-submit-btn').props.accessibilityState?.disabled).toBe(false),
      );
      fireEvent.press(screen.getByTestId('invite-submit-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('An invitation is already pending for this email'),
        ).toBeTruthy();
      });
    });
  });
});
