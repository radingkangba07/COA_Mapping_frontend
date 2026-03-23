import React from 'react';
import { View, Text } from 'react-native';
import type { BaseToastProps } from 'react-native-toast-message';
import { cn } from '@/shared/utils/string.utils';

type ToastType = 'success' | 'error' | 'warning';

const BORDER_COLOR: Record<ToastType, string> = {
  success: 'border-l-success',
  error: 'border-l-destructive',
  warning: 'border-l-warning',
};

const TITLE_COLOR: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
};

function createToastRenderer(type: ToastType) {
  return function ToastRenderer({ text1, text2 }: BaseToastProps): React.JSX.Element {
    return (
      <View
        className={cn(
          'mx-4 w-full max-w-sm rounded-lg border border-border bg-card px-4 py-3 shadow-md',
          'border-l-4',
          BORDER_COLOR[type],
        )}
      >
        {text1 !== undefined && text1.length > 0 && (
          <Text
            className={cn(
              'font-body text-sm font-semibold',
              TITLE_COLOR[type],
            )}
          >
            {text1}
          </Text>
        )}
        {text2 !== undefined && text2.length > 0 && (
          <Text className="mt-0.5 font-body text-xs text-muted-foreground">
            {text2}
          </Text>
        )}
      </View>
    );
  };
}

export const toastConfig = {
  success: createToastRenderer('success'),
  error: createToastRenderer('error'),
  warning: createToastRenderer('warning'),
};
