import React, { useCallback } from 'react';
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
  userId: z.string().min(1, 'Please enter your User ID').trim(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface LoginFormProps {
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly onLogin: (userId: string) => Promise<void>;
  readonly onClearError: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const LoginForm = ({
  isLoading,
  error,
  onLogin,
  onClearError,
}: LoginFormProps): React.JSX.Element => {

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: '' },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData): Promise<void> => {
      await onLogin(data.userId);
    },
    [onLogin],
  );

  const handlePress = useCallback((): void => {
    void handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  return (
    <Card testID="login-form-card">
      <Card.Header>
        <Card.Title>Sign in</Card.Title>
        <Card.Description>
          Enter your User ID to access your projects
        </Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <Controller
          control={control}
          name="userId"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error: fieldError },
          }) => (
            <Input
              label="User ID"
              placeholder="e.g., john.doe"
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
              returnKeyType="go"
              onSubmitEditing={handlePress}
              testID="login-user-id-input"
            />
          )}
        />

        {error !== null && (
          <View className="rounded-md bg-destructive/10 px-3 py-2">
            <Text className="text-sm text-destructive">{error.message}</Text>
          </View>
        )}

        <Button
          onPress={handlePress}
          isLoading={isLoading}
          testID="login-submit-btn"
        >
          Continue
        </Button>

      </Card.Content>
    </Card>
  );
};
