import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRegister = jest.fn();

jest.mock('../../services/auth.service', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
}));

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

// ─── Import (after mocks) ──────────────────────────────────────────────────

import { RegisterForm } from '../RegisterForm';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderForm(overrides: Partial<{
  onSuccess: (email: string) => void;
  onLoginPress: () => void;
}> = {}) {
  const onSuccess = overrides.onSuccess ?? jest.fn();
  const onLoginPress = overrides.onLoginPress ?? jest.fn();
  return {
    onSuccess,
    onLoginPress,
    ...render(<RegisterForm onSuccess={onSuccess} onLoginPress={onLoginPress} />),
  };
}

function fillForm(name: string, email: string, orgName: string) {
  fireEvent.changeText(screen.getByPlaceholderText('e.g., Jane Smith'), name);
  fireEvent.changeText(screen.getByPlaceholderText('e.g., jane@acme.com'), email);
  fireEvent.changeText(screen.getByPlaceholderText('e.g., Acme Corp'), orgName);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows zod validation errors on empty submit', async () => {
    renderForm();

    fireEvent.press(screen.getByTestId('register-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeTruthy();
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
      expect(screen.getByText('Organization name must be at least 2 characters')).toBeTruthy();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows email format error for invalid email', async () => {
    renderForm();

    fillForm('Jane Doe', 'not-an-email', 'Acme Inc');
    fireEvent.press(screen.getByTestId('register-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls onSuccess with email on successful registration', async () => {
    mockRegister.mockResolvedValue(ok({ userId: 'u1', message: 'ok' }));
    const { onSuccess } = renderForm();

    fillForm('Jane Doe', 'jane@acme.com', 'Acme Inc');
    fireEvent.press(screen.getByTestId('register-submit-btn'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('jane@acme.com');
    });
  });

  it('shows inline email error on 409 email duplicate', async () => {
    const duplicateError: AppError = {
      code: 'HTTP_409',
      message: 'Email already registered',
    };
    mockRegister.mockResolvedValue(err(duplicateError));
    renderForm();

    fillForm('Jane Doe', 'jane@acme.com', 'Acme Inc');
    fireEvent.press(screen.getByTestId('register-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeTruthy();
    });
  });

  it('shows inline org error on 409 org duplicate', async () => {
    const duplicateError: AppError = {
      code: 'HTTP_409',
      message: 'Organization name already taken',
    };
    mockRegister.mockResolvedValue(err(duplicateError));
    renderForm();

    fillForm('Jane Doe', 'jane@acme.com', 'Acme Inc');
    fireEvent.press(screen.getByTestId('register-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('Organization name already taken')).toBeTruthy();
    });
  });

  it('calls onLoginPress when login link is pressed', () => {
    const { onLoginPress } = renderForm();

    fireEvent.press(screen.getByTestId('register-login-link'));

    expect(onLoginPress).toHaveBeenCalledTimes(1);
  });
});
