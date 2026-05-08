import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Building2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/shared/components/layout/Screen';
import { LoginForm } from '../components/LoginForm';
import { useAuthViewModel } from '../hooks/useAuthViewModel';
import { useAuthStore } from '../store/auth.store';
import { colors } from '@/config/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props): React.JSX.Element => {
  const { login, isLoading, error, clearError } = useAuthViewModel();

  const handleLogin = useCallback(
    async (email: string): Promise<void> => {
      await login(email);
      const storeError = useAuthStore.getState().error;
      if (storeError === null) {
        navigation.navigate('CheckEmail', { email });
      }
    },
    [login, navigation],
  );

  return (
    <Screen scroll className="bg-background" testID="login-screen">
      <View className="flex-1 items-center justify-center px-4 py-8 md:py-16">
        <View className="w-full max-w-md lg:rounded-2xl lg:border lg:border-border lg:p-8 lg:shadow-lg">
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <Building2 size={32} color={colors.accentForeground} />
            </View>
            <Text className="font-heading text-2xl font-bold text-foreground">
              DataPortation
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Chart of Accounts Migration Tool
            </Text>
          </View>

          <LoginForm
            isLoading={isLoading}
            error={error}
            onLogin={handleLogin}
            onClearError={clearError}
          />

          <Text className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Text
              className="text-sm font-medium text-primary"
              onPress={() => navigation.navigate('Register')}
              testID="login-register-link"
            >
              Register
            </Text>
          </Text>
        </View>
      </View>
    </Screen>
  );
};
