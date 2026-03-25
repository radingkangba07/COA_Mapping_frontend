import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';

interface NetworkErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  testID?: string;
}

export const NetworkErrorFallback = ({
  error,
  onRetry,
  testID,
}: NetworkErrorFallbackProps): React.JSX.Element => (
  <View
    className="flex-1 items-center justify-center px-6 py-12"
    testID={testID ?? 'network-error-fallback'}
    accessibilityRole="alert"
    accessibilityLabel="Connection error"
  >
    <WifiOff size={48} color={colors.mutedForeground} />
    <Text className="mt-4 text-center font-heading text-xl font-semibold text-foreground">
      Connection Error
    </Text>
    <Text className="mt-2 text-center font-body text-sm text-muted-foreground">
      {error?.message ??
        'Unable to connect to the server. Please check your connection and try again.'}
    </Text>
    <View className="mt-6">
      <Button
        onPress={onRetry}
        testID={`${testID ?? 'network-error'}-retry`}
        accessibilityLabel="Retry connection"
        accessibilityRole="button"
      >
        Try Again
      </Button>
    </View>
  </View>
);
