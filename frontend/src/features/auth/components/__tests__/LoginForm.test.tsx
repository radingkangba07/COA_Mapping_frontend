import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { AppError } from '@/shared/types/result.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: { post: jest.fn(), get: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

jest.mock('@/config/theme', () => ({
  colors: {
    mutedForeground: '#888',
    foreground: '#000',
    primaryForeground: '#FFF',
  },
}));

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

// ─── Import (after mocks) ────────────────────────────────────────────────

import { LoginForm } from '../LoginForm';

// ─── Helpers ─────────────────────────────────────────────────────────────

function renderForm(overrides: Partial<{
  isLoading: boolean;
  error: AppError | null;
  onLogin: (email: string) => Promise<void>;
  onClearError: () => void;
}> = {}) {
  const onLogin = overrides.onLogin ?? jest.fn<Promise<void>, [string]>();
  const onClearError = overrides.onClearError ?? jest.fn();
  const props = {
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    onLogin,
    onClearError,
  };
  const utils = render(<LoginForm {...props} />);
  return { onLogin, onClearError, ...utils };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits valid email and calls onLogin', async () => {
    const onLogin = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
    renderForm({ onLogin });

    fireEvent.changeText(screen.getByTestId('login-email-input'), 'Jane@Acme.com');
    fireEvent.press(screen.getByTestId('login-submit-btn'));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('jane@acme.com');
    });
  });

  it('shows zod error for invalid email format', async () => {
    renderForm();

    fireEvent.changeText(screen.getByTestId('login-email-input'), 'not-an-email');
    fireEvent.press(screen.getByTestId('login-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('shows inline "No account found" on HTTP_404', async () => {
    const error404: AppError = { code: 'HTTP_404', message: 'user not found' };
    renderForm({ error: error404 });

    await waitFor(() => {
      expect(screen.getByText('No account found. Register instead?')).toBeTruthy();
    });
  });

  it('shows inline "Please verify your email first" on HTTP_403', async () => {
    const error403: AppError = { code: 'HTTP_403', message: 'email not verified' };
    renderForm({ error: error403 });

    await waitFor(() => {
      expect(screen.getByText('Please verify your email first')).toBeTruthy();
    });
  });

  it('shows generic banner on HTTP_500 or other codes', () => {
    const error500: AppError = { code: 'HTTP_500', message: 'Internal server error' };
    renderForm({ error: error500 });

    expect(screen.getByText('Internal server error')).toBeTruthy();
  });

  it('submit button copy is "Send login link"', () => {
    renderForm();

    expect(screen.getByText('Send login link')).toBeTruthy();
  });

  it('no userId input is present', () => {
    renderForm();

    expect(screen.queryByTestId('login-user-id-input')).toBeNull();
  });
});
