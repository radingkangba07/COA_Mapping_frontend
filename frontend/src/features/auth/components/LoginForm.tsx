import React, { useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import type { AppError } from '@/shared/types/result.types';

// ─── Form Schema ───────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255)
    .trim()
    .toLowerCase(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface LoginFormProps {
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly onLogin: (email: string) => Promise<void>;
  readonly onClearError: () => void;
}

// ─── Error Routing ─────────────────────────────────────────────────────────

function getInlineErrorMessage(error: AppError): string | null {
  switch (error.code) {
    case 'HTTP_404':
      return 'No account found. Register instead?';
    case 'HTTP_403':
      return 'Please verify your email first';
    default:
      return null;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export const LoginForm = ({
  isLoading,
  error,
  onLogin,
  onClearError,
}: LoginFormProps): React.JSX.Element => {

  const { control, handleSubmit, setError } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (error === null) return;
    const inlineMessage = getInlineErrorMessage(error);
    if (inlineMessage !== null) {
      setError('email', { message: inlineMessage });
    }
  }, [error, setError]);

  const onSubmit = useCallback(
    async (data: LoginFormData): Promise<void> => {
      await onLogin(data.email);
    },
    [onLogin],
  );

  const handlePress = useCallback((): void => {
    void handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const isGenericError = error !== null && getInlineErrorMessage(error) === null;

  return (
    <Card testID="login-form-card">
      <Card.Header>
        <Card.Title>Sign in</Card.Title>
        <Card.Description>
          Enter your email to receive a login link
        </Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error: fieldError },
          }) => (
            <Input
              label="Email"
              placeholder="e.g., jane@acme.com"
              value={value}
              onChangeText={(text: string) => {
                onChange(text);
                if (error) {
                  onClearError();
                }
              }}
              onBlur={onBlur}
              editable={!isLoading}
              error={fieldError?.message}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={handlePress}
              testID="login-email-input"
            />
          )}
        />

        {isGenericError && (
          <View className="rounded-md bg-destructive/10 px-3 py-2">
            <Text className="text-sm text-destructive">{error.message}</Text>
          </View>
        )}

        <Button
          onPress={handlePress}
          isLoading={isLoading}
          testID="login-submit-btn"
        >
          Send login link
        </Button>

      </Card.Content>
    </Card>
  );
};
