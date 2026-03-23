import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmDialogProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface UseConfirmReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  isVisible: boolean;
  dialogProps: ConfirmDialogProps;
}

const DEFAULT_CONFIRM_LABEL = 'Confirm';
const DEFAULT_CANCEL_LABEL = 'Cancel';

const EMPTY_DIALOG_PROPS: ConfirmDialogProps = {
  isVisible: false,
  title: '',
  message: '',
  confirmLabel: DEFAULT_CONFIRM_LABEL,
  cancelLabel: DEFAULT_CANCEL_LABEL,
  onConfirm: () => {},
  onCancel: () => {},
};

function confirmNative(options: ConfirmOptions): Promise<boolean> {
  const confirmLabel = options.confirmLabel ?? DEFAULT_CONFIRM_LABEL;
  const cancelLabel = options.cancelLabel ?? DEFAULT_CANCEL_LABEL;

  return new Promise<boolean>((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function useConfirm(): UseConfirmReturn {
  const [dialogProps, setDialogProps] = useState<ConfirmDialogProps>(EMPTY_DIALOG_PROPS);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const dismiss = useCallback((): void => {
    setDialogProps(EMPTY_DIALOG_PROPS);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      if (Platform.OS !== 'web') {
        return confirmNative(options);
      }

      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setDialogProps({
          isVisible: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
          cancelLabel: options.cancelLabel ?? DEFAULT_CANCEL_LABEL,
          onConfirm: () => {
            resolve(true);
            dismiss();
          },
          onCancel: () => {
            resolve(false);
            dismiss();
          },
        });
      });
    },
    [dismiss],
  );

  return {
    confirm,
    isVisible: dialogProps.isVisible,
    dialogProps,
  };
}
