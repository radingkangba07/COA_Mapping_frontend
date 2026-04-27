import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail } from 'lucide-react-native';
import { Screen } from '@/shared/components/layout/Screen';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { useCheckEmailViewModel } from '../hooks/useCheckEmailViewModel';
import { colors } from '@/config/theme';
import type { AuthStackParamList } from '@/navigation/types';

const MAX_RESENDS = 3;

type Props = NativeStackScreenProps<AuthStackParamList, 'CheckEmail'>;

export const CheckEmailScreen = ({ route, navigation }: Props): React.JSX.Element => {
  const { email } = route.params;
  const {
    resendButtonText,
    isResendDisabled,
    isResending,
    resendCount,
    handleResend,
  } = useCheckEmailViewModel(email);

  const handleBackToLogin = useCallback((): void => {
    navigation.navigate('Login');
  }, [navigation]);

  return (
    <Screen scroll className="bg-background" testID="check-email-screen">
      <View className="flex-1 items-center justify-center px-4 py-8 md:py-16">
        <View className="w-full max-w-md lg:rounded-2xl lg:border lg:border-border lg:p-8 lg:shadow-lg">
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail size={32} color={colors.primary} />
            </View>
            <Text className="font-heading text-2xl font-bold text-foreground">
              Check your email
            </Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              We sent a verification link to
            </Text>
            <Text className="mt-1 font-mono text-sm font-medium text-foreground">
              {email}
            </Text>
            <Text className="mt-4 text-center text-xs text-muted-foreground">
              Click the link in the email to verify your account. If you don't see it, check your spam folder.
            </Text>
          </View>

          <Card>
            <Card.Content className="gap-4">
              <Button
                variant="outline"
                onPress={handleResend}
                disabled={isResendDisabled}
                isLoading={isResending}
                testID="resend-verification-btn"
              >
                {resendButtonText}
              </Button>

              {resendCount > 0 && resendCount < MAX_RESENDS && (
                <Text className="text-center text-xs text-muted-foreground">
                  {MAX_RESENDS - resendCount} resends remaining
                </Text>
              )}

              <Pressable onPress={handleBackToLogin} testID="back-to-login-link">
                <Text className="text-center text-sm text-primary">
                  ← Back to login
                </Text>
              </Pressable>
            </Card.Content>
          </Card>
        </View>
      </View>
    </Screen>
  );
};
