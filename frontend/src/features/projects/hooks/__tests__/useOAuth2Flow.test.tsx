// Unit tests for useOAuth2Flow — mocks Platform.OS, window.open, and the
// OAuth2 start endpoint to exercise state machine transitions.

import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('@/shared/services/http/http.instance', () => ({ httpClient: {} }));

jest.mock('../../services/erp-connection.service', () => ({
  startOAuth2Flow: jest.fn(),
}));

import { ok, err } from '@/shared/types/result.types';
import { startOAuth2Flow } from '../../services/erp-connection.service';
import { useOAuth2Flow } from '../useOAuth2Flow';

const mockStartOAuth2Flow = startOAuth2Flow as jest.MockedFunction<typeof startOAuth2Flow>;

const mockPopup = { closed: false };
const mockWindowOpen = jest.fn(() => mockPopup);

beforeEach(() => {
  jest.clearAllMocks();
  // Reset window.open implementation so "popup blocked" tests don't leak null return.
  mockWindowOpen.mockImplementation(() => mockPopup);
  // Default: web platform where OAuth is supported
  Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });
  Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true, configurable: true });
  Object.defineProperty(window, 'addEventListener', { value: jest.fn(), writable: true, configurable: true });
  Object.defineProperty(window, 'removeEventListener', { value: jest.fn(), writable: true, configurable: true });
});

describe('useOAuth2Flow', () => {
  it('starts in idle status with no error', () => {
    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('sets status to error immediately on non-web platforms', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));

    await act(async () => {
      await result.current.connect('cid', 'secret', 'https://acme.netsuite.com');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/web browser/i);
  });

  it('sets status to error when startOAuth2Flow fails', async () => {
    mockStartOAuth2Flow.mockResolvedValue(err({ code: 'SERVER_ERROR', message: 'invalid_netsuite_url', details: {} }));

    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));

    await act(async () => {
      await result.current.connect('cid', 'secret', 'https://acme.netsuite.com');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('invalid_netsuite_url');
  });

  it('sets status to connecting then error when popup is blocked', async () => {
    mockStartOAuth2Flow.mockResolvedValue(ok({ auth_url: 'https://auth.url', state: 'st' }));
    mockWindowOpen.mockReturnValue(null as unknown as Window); // popup blocked

    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));

    await act(async () => {
      await result.current.connect('cid', 'secret', 'https://acme.netsuite.com');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/popup blocked/i);
  });

  it('opens the auth_url from startOAuth2Flow in a popup', async () => {
    mockStartOAuth2Flow.mockResolvedValue(ok({ auth_url: 'https://auth.example.com', state: 'st' }));

    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));

    await act(async () => {
      await result.current.connect('cid', 'secret', 'https://acme.netsuite.com');
    });

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://auth.example.com',
      'netsuite-oauth',
      expect.any(String),
    );
  });

  it('adds a message event listener after opening the popup', async () => {
    mockStartOAuth2Flow.mockResolvedValue(ok({ auth_url: 'https://auth.url', state: 'st' }));

    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));

    await act(async () => {
      await result.current.connect('cid', 'secret', 'https://acme.netsuite.com');
    });

    expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('reset returns to idle and clears error', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const { result } = renderHook(() => useOAuth2Flow(jest.fn()));

    await act(async () => {
      await result.current.connect('cid', 'secret', 'https://acme.netsuite.com');
    });

    expect(result.current.status).toBe('error');

    act(() => { result.current.reset(); });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
