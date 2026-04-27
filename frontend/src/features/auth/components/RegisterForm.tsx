import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import type { AppError } from '@/shared/types/result.types';
import { httpClient } from '@/shared/services/http/http.instance';
import { register } from '../services/auth.service';

// ─── Form Schema ───────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be at most 255 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(255, 'Email must be at most 255 characters'),
  orgName: z
    .string()
    .trim()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255, 'Organization name must be at most 255 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface RegisterFormProps {
  readonly onSuccess: (email: string) => void;
  readonly onLoginPress: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const RegisterForm = ({
  onSuccess,
  onLoginPress,
}: RegisterFormProps): React.JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<AppError | null>(null);

  const { control, handleSubmit, setError } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', orgName: '' },
  });

  const onSubmit = useCallback(
    async (data: RegisterFormData): Promise<void> => {
      setIsLoading(true);
      setServerError(null);

      const result = await register(httpClient, data);

      setIsLoading(false);

      if (result.ok) {
        onSuccess(data.email);
        return;
      }

      const message = result.error.message.toLowerCase();

      if (message.includes('email already registered')) {
        setError('email', { message: 'Email already registered' });
      } else if (message.includes('organization name already taken')) {
        setError('orgName', {
          message:
            'This organization is already registered. Please contact the organization admin for an invite.',
        });
      } else {
        setServerError(result.error);
      }
    },
    [onSuccess, setError],
  );

  const handlePress = useCallback((): void => {
    void handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  return (
    <Card testID="register-form-card">
      <Card.Header>
        <Card.Title>Create account</Card.Title>
        <Card.Description>
          Enter your details to get started
        </Card.Description>
      </Card.Header>
      <Card.Content className="gap-4">
        <Controller
          control={control}
          name="name"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error: fieldError },
          }) => (
            <Input
              label="Full Name"
              placeholder="e.g., Jane Smith"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
              error={fieldError?.message}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              testID="register-name-input"
            />
          )}
        />

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
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
              error={fieldError?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              testID="register-email-input"
            />
          )}
        />

        <Controller
          control={control}
          name="orgName"
          render={({
            field: { onChange, onBlur, value },
            fieldState: { error: fieldError },
          }) => (
            <Input
              label="Organization Name"
              placeholder="e.g., Acme Corp"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!isLoading}
              error={fieldError?.message}
              autoCapitalize="words"
              autoCorrect={false}
              testID="register-org-input"
            />
          )}
        />

        {serverError !== null && (
          <View className="rounded-md bg-destructive/10 px-3 py-2">
            <Text className="text-sm text-destructive">
              {serverError.message}
            </Text>
          </View>
        )}

        <Button
          onPress={handlePress}
          isLoading={isLoading}
          testID="register-submit-btn"
        >
          Create Account
        </Button>

        <Pressable
          onPress={onLoginPress}
          disabled={isLoading}
          testID="register-login-link"
        >
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Text className="text-sm font-medium text-primary">Log in</Text>
          </Text>
        </Pressable>
      </Card.Content>
    </Card>
  );
};
