import { useCallback } from 'react';
import Toast from 'react-native-toast-message';

interface ToastMethods {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

export function useToast(): ToastMethods {
  const showSuccess = useCallback((title: string, message?: string): void => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
    });
  }, []);

  const showError = useCallback((title: string, message?: string): void => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
    });
  }, []);

  // react-native-toast-message has no built-in 'warning' type; 'info' is the closest match
  const showWarning = useCallback((title: string, message?: string): void => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
    });
  }, []);

  return { showSuccess, showError, showWarning };
}
