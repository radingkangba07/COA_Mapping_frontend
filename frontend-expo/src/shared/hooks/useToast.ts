import { useCallback } from 'react';
import Toast from 'react-native-toast-message';

const DEFAULT_VISIBILITY_TIME = 3000;

interface UseToastReturn {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

export function useToast(): UseToastReturn {
  const showSuccess = useCallback((message: string, title?: string): void => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      visibilityTime: DEFAULT_VISIBILITY_TIME,
    });
  }, []);

  const showError = useCallback((message: string, title?: string): void => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: DEFAULT_VISIBILITY_TIME,
    });
  }, []);

  const showWarning = useCallback((message: string, title?: string): void => {
    Toast.show({
      type: 'info', // react-native-toast-message has no 'warning' type; 'info' is the closest match
      text1: title,
      text2: message,
      visibilityTime: DEFAULT_VISIBILITY_TIME,
    });
  }, []);

  return { showSuccess, showError, showWarning };
}
