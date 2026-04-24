import Toast from 'react-native-toast-message';

export function showTransientErrorToast(message: string): void {
  Toast.show({
    type: 'error',
    text1: 'Network Error',
    text2: message,
    position: 'top',
    visibilityTime: 4000,
  });
}

export function showSessionExpiredToast(): void {
  Toast.show({
    type: 'error',
    text1: 'Session expired',
    text2: 'Please log in again.',
    position: 'top',
    visibilityTime: 4000,
  });
}

export function showAccessDeniedToast(): void {
  Toast.show({
    type: 'error',
    text1: 'Access denied',
    text2: 'You do not have permission to perform this action.',
    position: 'top',
    visibilityTime: 4000,
  });
}

export function isTransientError(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status >= 500 || status === 408 || status === 429;
}
