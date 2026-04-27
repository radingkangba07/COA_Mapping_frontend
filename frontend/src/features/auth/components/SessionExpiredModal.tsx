import React, { useCallback } from 'react';
import { Modal, View, Text } from 'react-native';
import { LogIn } from 'lucide-react-native';
import { useAuthStore } from '../store/auth.store';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';

export function SessionExpiredModal(): React.JSX.Element | null {
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const logout = useAuthStore((s) => s.logout);

  const handleLoginAgain = useCallback(() => {
    void logout();
  }, [logout]);

  if (!sessionExpired) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg">
          <View className="mb-4 items-center">
            <View className="mb-3 rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <LogIn size={24} color={colors.destructive} />
            </View>
            <Text className="font-heading text-lg font-semibold text-foreground">
              Session expired
            </Text>
            <Text className="mt-2 text-center font-body text-sm text-muted-foreground">
              Your session has expired. Please log in again to continue.
            </Text>
          </View>
          <Button onPress={handleLoginAgain} className="mt-2 w-full">
            <Text className="font-body text-sm font-semibold text-primary-foreground">
              Log in again
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
