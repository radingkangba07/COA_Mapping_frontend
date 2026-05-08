import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2 } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { RegisterForm } from '../components/RegisterForm';
import { colors } from '@/config/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props): React.JSX.Element => {
  const handleSuccess = useCallback((email: string): void => {
    navigation.navigate('CheckEmail', { email });
  }, [navigation]);

  const handleLoginPress = useCallback((): void => {
    navigation.navigate('Login');
  }, [navigation]);

  return (
    <Screen scroll className="bg-background" testID="register-screen">
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
              Create your account
            </Text>
          </View>

          <RegisterForm
            onSuccess={handleSuccess}
            onLoginPress={handleLoginPress}
          />
        </View>
      </View>
    </Screen>
  );
};
