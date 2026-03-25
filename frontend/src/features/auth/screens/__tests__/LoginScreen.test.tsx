import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

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
    Building2: icon('Building2'),
    __esModule: true,
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

const mockLogin = jest.fn().mockResolvedValue(undefined);
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockClearError = jest.fn();

const mockAuthViewModel = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: mockLogin,
  logout: mockLogout,
  clearError: mockClearError,
};

jest.mock('../../hooks/useAuthViewModel', () => ({
  useAuthViewModel: jest.fn(() => mockAuthViewModel),
}));

jest.mock('../../components/LoginForm', () => ({
  LoginForm: ({
    isLoading,
    error,
    onLogin,
    onClearError,
  }: {
    isLoading: boolean;
    error: { message: string } | null;
    onLogin: (userId: string) => void;
    onClearError: () => void;
  }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="login-form">
        <Text>Sign in</Text>
        {isLoading ? <Text testID="login-form-loading">Loading</Text> : null}
        {error !== null ? <Text testID="login-form-error">{error.message}</Text> : null}
        <Pressable testID="login-form-submit" onPress={() => onLogin('testuser')} />
        <Pressable testID="login-form-clear-error" onPress={onClearError} />
      </View>
    );
  },
}));

jest.mock('@/config/theme', () => ({
  colors: { accentForeground: '#FFFFFF' },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { useAuthViewModel } from '../../hooks/useAuthViewModel';
import { LoginScreen } from '../LoginScreen';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthViewModel.isLoading = false;
    mockAuthViewModel.error = null;
    (useAuthViewModel as jest.Mock).mockReturnValue({ ...mockAuthViewModel });
  });

  it('renders the login screen with testID', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('login-screen')).toBeTruthy();
  });

  it('shows "COA Migration System" heading', () => {
    render(<LoginScreen />);
    expect(screen.getByText('COA Migration System')).toBeTruthy();
  });

  it('shows subtitle text', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Chart of Accounts Migration Tool')).toBeTruthy();
  });

  it('shows auto-registration notice', () => {
    render(<LoginScreen />);
    expect(
      screen.getByText('New users are automatically registered on first login'),
    ).toBeTruthy();
  });

  it('renders the Building2 icon', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('Building2-icon')).toBeTruthy();
  });

  it('renders the LoginForm component', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('login-form')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('calls login when form submit is pressed', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('login-form-submit'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser');
    });
  });

  it('passes error to LoginForm when error is set', () => {
    const errorObj = { code: 'AUTH_FAILED', message: 'Invalid user ID' };
    (useAuthViewModel as jest.Mock).mockReturnValue({
      ...mockAuthViewModel,
      error: errorObj,
    });

    render(<LoginScreen />);
    expect(screen.getByTestId('login-form-error')).toBeTruthy();
    expect(screen.getByText('Invalid user ID')).toBeTruthy();
  });

  it('shows loading state when isLoading is true', () => {
    (useAuthViewModel as jest.Mock).mockReturnValue({
      ...mockAuthViewModel,
      isLoading: true,
    });

    render(<LoginScreen />);
    expect(screen.getByTestId('login-form-loading')).toBeTruthy();
  });

  it('calls clearError when form clear-error is triggered', () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('login-form-clear-error'));
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });
});
