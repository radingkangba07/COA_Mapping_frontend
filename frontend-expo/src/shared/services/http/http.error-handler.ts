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

export function isTransientError(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status >= 500 || status === 408 || status === 429;
}
