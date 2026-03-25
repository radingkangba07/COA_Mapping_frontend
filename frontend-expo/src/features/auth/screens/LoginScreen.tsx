import React from 'react';
import { View, Text } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { LoginForm } from '../components/LoginForm';
import { useAuthViewModel } from '../hooks/useAuthViewModel';
import { colors } from '@/config/theme';

export const LoginScreen = (): React.JSX.Element => {
  const { login, isLoading, error, clearError } = useAuthViewModel();

  return (
    <Screen scroll className="bg-background" testID="login-screen">
      <View className="flex-1 items-center justify-center px-4 py-8">
        <View className="w-full max-w-md">
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <Building2 size={32} color={colors.accentForeground} />
            </View>
            <Text className="font-heading text-2xl font-bold text-foreground">
              COA Migration System
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Chart of Accounts Migration Tool
            </Text>
          </View>

          <LoginForm
            isLoading={isLoading}
            error={error}
            onLogin={login}
            onClearError={clearError}
          />

          <Text className="mt-6 text-center text-xs text-muted-foreground">
            New users are automatically registered on first login
          </Text>
        </View>
      </View>
    </Screen>
  );
};
