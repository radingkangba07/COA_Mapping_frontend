import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ok, err } from '@/shared/types/result.types';
import type { AppError } from '@/shared/types/result.types';

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
    Mail: icon('Mail'),
    __esModule: true,
  };
});

jest.mock('@/shared/utils/platform.utils', () => ({
  isWeb: true,
  isNative: false,
}));

jest.mock('@/config/theme', () => ({
  colors: {
    primary: '#3B82F6',
    mutedForeground: '#888',
    foreground: '#000',
    primaryForeground: '#FFF',
  },
}));

const mockResendVerification = jest.fn();

jest.mock('../../services/auth.service', () => ({
  resendVerification: (...args: unknown[]) => mockResendVerification(...args),
}));

jest.mock('@/shared/services/http/http.instance', () => ({
  httpClient: { post: jest.fn(), get: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/shared/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

// ─── Import (after mocks) ──────────────────────────────────────────────────

import { CheckEmailScreen } from '../CheckEmailScreen';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

function createProps(email = 'jane@acme.com') {
  return {
    route: {
      params: { email },
      key: 'CheckEmail-test',
      name: 'CheckEmail' as const,
    },
    navigation: {
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      reset: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(),
      getId: jest.fn(),
      setParams: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
      pop: jest.fn(),
      popToTop: jest.fn(),
    },
  } as unknown as React.ComponentProps<typeof CheckEmailScreen>;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CheckEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays email passed via route params', () => {
    render(<CheckEmailScreen {...createProps('jane@acme.com')} />);

    expect(screen.getByText('jane@acme.com')).toBeTruthy();
    expect(screen.getByText('Check your email')).toBeTruthy();
    expect(screen.getByText('We sent a verification link to')).toBeTruthy();
  });

  it('calls resendVerification when resend button pressed', async () => {
    mockResendVerification.mockResolvedValue(ok(undefined));

    render(<CheckEmailScreen {...createProps('jane@acme.com')} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    expect(mockResendVerification).toHaveBeenCalledWith(
      expect.anything(),
      'jane@acme.com',
    );
  });

  it('disables resend button after 3 successful resends', async () => {
    mockResendVerification.mockResolvedValue(ok(undefined));

    render(<CheckEmailScreen {...createProps('jane@acme.com')} />);

    // Resend 1
    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    // Advance past cooldown
    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    // Resend 2
    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    // Resend 3
    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    await waitFor(() => {
      expect(screen.getByText('Maximum resends reached')).toBeTruthy();
    });
  });

  it('navigates to Login on back link press', () => {
    render(<CheckEmailScreen {...createProps()} />);

    fireEvent.press(screen.getByTestId('back-to-login-link'));

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('shows success toast after successful resend', async () => {
    mockResendVerification.mockResolvedValue(ok(undefined));

    render(<CheckEmailScreen {...createProps('jane@acme.com')} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Verification email sent',
      expect.stringContaining('jane@acme.com'),
    );
  });

  it('shows error toast on resend failure', async () => {
    const error: AppError = { code: 'HTTP_500', message: 'Server error' };
    mockResendVerification.mockResolvedValue(err(error));

    render(<CheckEmailScreen {...createProps('jane@acme.com')} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    expect(mockShowError).toHaveBeenCalledWith('Resend failed', 'Server error');
  });

  it('shows cooldown countdown text after resend', async () => {
    mockResendVerification.mockResolvedValue(ok(undefined));

    render(<CheckEmailScreen {...createProps()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    expect(screen.getByText('Resend in 60s')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(screen.getByText('Resend in 55s')).toBeTruthy();
  });

  it('shows resends remaining count', async () => {
    mockResendVerification.mockResolvedValue(ok(undefined));

    render(<CheckEmailScreen {...createProps()} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-verification-btn'));
    });

    // After 1 resend, should show "2 resends remaining"
    expect(screen.getByText('2 resends remaining')).toBeTruthy();
  });
});
