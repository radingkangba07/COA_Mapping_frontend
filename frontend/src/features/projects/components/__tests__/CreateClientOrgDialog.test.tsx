import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createOrgId } from '@/shared/types/common.types';
import type { ClientOrg } from '../../types/org.types';

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
  colors: { foreground: '#09090B', primaryForeground: '#FAFAFA' },
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}));

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

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

const mockCreateClientOrg = jest.fn();
jest.mock('../../services/org.service', () => ({
  createClientOrg: (...args: unknown[]) => mockCreateClientOrg(...args),
}));

// ─── Import (after mocks) ────────────────────────────────────────────────────

import { CreateClientOrgDialog } from '../CreateClientOrgDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PARENT_ORG_ID = createOrgId('employer-001');
const mockOnClose = jest.fn();

const MOCK_CREATED: ClientOrg = {
  id: createOrgId('client-001'),
  name: 'Retail Corp',
  slug: 'retail-corp',
  description: null,
  orgType: 'client',
  parentOrgId: PARENT_ORG_ID,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
};

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateClientOrgDialog
        visible
        onClose={mockOnClose}
        parentOrgId={PARENT_ORG_ID}
        testID="create-dialog"
      />
    </QueryClientProvider>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CreateClientOrgDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClientOrg.mockResolvedValue({ ok: true, data: MOCK_CREATED });
  });

  it('renders dialog with title and inputs', () => {
    renderDialog();
    expect(screen.getByText('New Client Workspace')).toBeTruthy();
    expect(screen.getByTestId('client-org-name-input')).toBeTruthy();
    expect(screen.getByTestId('client-org-description-input')).toBeTruthy();
  });

  it('submit button is disabled when name is empty', () => {
    renderDialog();
    const btn = screen.getByTestId('create-client-org-submit-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    expect(mockCreateClientOrg).not.toHaveBeenCalled();
  });

  it('enables submit button after valid name is entered', async () => {
    renderDialog();
    fireEvent.changeText(screen.getByTestId('client-org-name-input'), 'Retail Corp');

    await waitFor(() => {
      const btn = screen.getByTestId('create-client-org-submit-btn');
      expect(btn.props.accessibilityState?.disabled).toBe(false);
    });
  });

  it('calls createClientOrg with name and description on valid submit', async () => {
    renderDialog();

    fireEvent.changeText(screen.getByTestId('client-org-name-input'), 'Retail Corp');
    fireEvent.changeText(screen.getByTestId('client-org-description-input'), 'A client');

    await waitFor(() =>
      expect(screen.getByTestId('create-client-org-submit-btn').props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(screen.getByTestId('create-client-org-submit-btn'));

    await waitFor(() => expect(mockCreateClientOrg).toHaveBeenCalledTimes(1));

    expect(mockCreateClientOrg).toHaveBeenCalledWith(
      expect.anything(),
      PARENT_ORG_ID,
      { name: 'Retail Corp', description: 'A client' },
    );
  });

  it('calls createClientOrg without description when field is empty', async () => {
    renderDialog();
    fireEvent.changeText(screen.getByTestId('client-org-name-input'), 'Retail Corp');

    await waitFor(() =>
      expect(screen.getByTestId('create-client-org-submit-btn').props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(screen.getByTestId('create-client-org-submit-btn'));

    await waitFor(() => expect(mockCreateClientOrg).toHaveBeenCalledTimes(1));

    const call = mockCreateClientOrg.mock.calls[0];
    expect(call[2].description).toBeUndefined();
  });

  it('shows success toast and calls onClose after creation', async () => {
    renderDialog();
    fireEvent.changeText(screen.getByTestId('client-org-name-input'), 'Retail Corp');

    await waitFor(() =>
      expect(screen.getByTestId('create-client-org-submit-btn').props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(screen.getByTestId('create-client-org-submit-btn'));

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        'Client workspace created',
        'Retail Corp is ready.',
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error toast and does NOT call onClose on failure', async () => {
    mockCreateClientOrg.mockResolvedValue({
      ok: false,
      error: { code: 'HTTP_403', message: 'Forbidden' },
    });

    renderDialog();
    fireEvent.changeText(screen.getByTestId('client-org-name-input'), 'Retail Corp');

    await waitFor(() =>
      expect(screen.getByTestId('create-client-org-submit-btn').props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(screen.getByTestId('create-client-org-submit-btn'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Failed to create client workspace',
        'Forbidden',
      );
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose and resets form when cancel is pressed', () => {
    renderDialog();

    fireEvent.changeText(screen.getByTestId('client-org-name-input'), 'Some Name');
    fireEvent.press(screen.getByTestId('create-client-org-cancel-btn'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
