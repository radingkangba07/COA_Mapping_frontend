import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface UseConfirmReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  isVisible: boolean;
  confirmOptions: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirm(): UseConfirmReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    if (Platform.OS !== 'web') {
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          options.title,
          options.message,
          [
            {
              text: options.cancelText ?? 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: options.confirmText ?? 'Confirm',
              style: 'destructive',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false },
        );
      });
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmOptions(options);
      setIsVisible(true);
    });
  }, []);

  const onConfirm = useCallback((): void => {
    setIsVisible(false);
    setConfirmOptions(null);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const onCancel = useCallback((): void => {
    setIsVisible(false);
    setConfirmOptions(null);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return { confirm, isVisible, confirmOptions, onConfirm, onCancel };
}
