import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useIsOnline } from '@/shared/store/app.selectors';
import { colors } from '@/config/theme';

export const OfflineBanner = (): React.JSX.Element | null => {
  const isOnline = useIsOnline();

  if (isOnline) {
    return null;
  }

  return (
    <View
      className="flex-row items-center justify-center gap-2 bg-destructive px-4 py-2"
      testID="offline-banner"
      accessibilityRole="alert"
      accessibilityLabel="You are currently offline"
    >
      <WifiOff size={16} color={colors.destructiveForeground} />
      <Text className="font-body text-sm font-medium text-destructive-foreground">
        You are offline. Some features may be unavailable.
      </Text>
    </View>
  );
};
