import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { ProjectId } from '@/shared/types/common.types';
import { createUserId } from '@/shared/types/common.types';
import type { Result } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';
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
  colors: { primaryForeground: '#FAFAFA', mutedForeground: '#71717A', foreground: '#09090B' },
}));

const mockGrantAsync = jest.fn<
  Promise<Result<AccessResponse, AppError>>,
  [{ userId: ReturnType<typeof createUserId>; permission: string }]
>();
const mockOnClose = jest.fn();

const mockUseProjectAccess = jest.fn((..._args: unknown[]) => ({
  members: [],
  isLoading: false,
  error: null,
  canManage: true,
  currentUserId: null,
  grant: jest.fn(),
  grantAsync: mockGrantAsync,
  revoke: jest.fn(),
  isGranting: false,
  isRevoking: false,
}));

jest.mock('../../hooks/useProjectAccess', () => ({
  useProjectAccess: (...args: unknown[]) => mockUseProjectAccess(...args),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { AddMemberDialog } from '../AddMemberDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROJECT_ID = 'proj-1' as ProjectId;

function renderDialog(visible = true) {
  return render(
    <AddMemberDialog visible={visible} onClose={mockOnClose} projectId={PROJECT_ID} />,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AddMemberDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGrantAsync.mockResolvedValue({
      ok: true,
      data: {
        userId: createUserId('user@test.com'),
        name: 'Test User',
        email: 'user@test.com',
        permission: 'viewer',
      },
    });
  });

  it('renders the dialog when visible', () => {
    renderDialog();
    expect(screen.getByTestId('add-member-dialog')).toBeTruthy();
    expect(screen.getByText('Add Member')).toBeTruthy();
  });

  it('shows validation error on empty userId when submitting', async () => {
    renderDialog();

    const submitBtn = screen.getByTestId('add-member-submit-btn');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('User ID required')).toBeTruthy();
    });

    expect(mockGrantAsync).not.toHaveBeenCalled();
  });

  it('calls grantAsync with expected payload on valid submit', async () => {
    renderDialog();

    fireEvent.changeText(screen.getByTestId('add-member-user-input'), 'user@test.com');

    const submitBtn = screen.getByTestId('add-member-submit-btn');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(mockGrantAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockGrantAsync).toHaveBeenCalledWith({
      userId: createUserId('user@test.com'),
      permission: 'viewer',
    });
  });

  it('calls onClose after a successful grant', async () => {
    renderDialog();

    fireEvent.changeText(screen.getByTestId('add-member-user-input'), 'user@test.com');

    fireEvent.press(screen.getByTestId('add-member-submit-btn'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call onClose after a failed grant', async () => {
    mockGrantAsync.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: 'Member already exists' },
    });

    renderDialog();

    fireEvent.changeText(screen.getByTestId('add-member-user-input'), 'user@test.com');

    fireEvent.press(screen.getByTestId('add-member-submit-btn'));

    await waitFor(() => {
      expect(mockGrantAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
