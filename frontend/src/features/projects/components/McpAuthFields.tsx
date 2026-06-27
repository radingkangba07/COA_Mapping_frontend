import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/shared/utils/string.utils';
import type {
  McpConnectionForm,
  McpFormAuthType,
} from '../services/mcp.service';
import { McpSecretInput } from './McpSecretInput';
import {
  AUTH_FIELDS,
  AUTH_TYPE_OPTIONS,
  type AuthFieldErrors,
  type AuthFieldSpec,
  type AuthTypeOption,
} from './McpAuthFields.config';

interface AuthTypeOptionButtonProps {
  option: AuthTypeOption;
  isSelected: boolean;
  onSelect: (value: McpFormAuthType) => void;
}

const AuthTypeOptionButton = ({
  option,
  isSelected,
  onSelect,
}: AuthTypeOptionButtonProps): React.JSX.Element => {
  const handlePress = useCallback((): void => {
    onSelect(option.value);
  }, [onSelect, option.value]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={option.label}
      className={cn(
        'flex-1 items-center justify-center rounded-md border px-3 py-2',
        isSelected ? 'border-primary bg-primary' : 'border-border bg-muted',
      )}
      testID={option.testID}
    >
      <Text
        className={cn(
          'font-body text-sm font-medium',
          isSelected ? 'text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        {option.label}
      </Text>
    </Pressable>
  );
};

interface AuthFieldProps {
  spec: AuthFieldSpec;
  value: string;
  error?: string;
  onPatch: (patch: Partial<McpConnectionForm>) => void;
}

const AuthField = ({
  spec,
  value,
  error,
  onPatch,
}: AuthFieldProps): React.JSX.Element => {
  const handleChange = useCallback(
    (next: string): void => {
      onPatch({ [spec.key]: next });
    },
    [onPatch, spec.key],
  );

  if (spec.secret) {
    return (
      <McpSecretInput
        label={spec.label}
        value={value}
        onChangeText={handleChange}
        placeholder={spec.placeholder}
        secretLabel={spec.secretLabel}
        error={error}
        testID={spec.testID}
      />
    );
  }

  return (
    <Input
      label={spec.label}
      value={value}
      onChangeText={handleChange}
      placeholder={spec.placeholder}
      error={error}
      autoCapitalize="none"
      keyboardType={spec.keyboardUrl === true ? 'url' : 'default'}
      testID={spec.testID}
    />
  );
};

interface McpAuthFieldsProps {
  form: McpConnectionForm;
  onPatch: (patch: Partial<McpConnectionForm>) => void;
  errors?: AuthFieldErrors;
  testID?: string;
}

export const McpAuthFields = ({
  form,
  onPatch,
  errors,
  testID = 'mcp-auth-fields',
}: McpAuthFieldsProps): React.JSX.Element => {
  const handleAuthTypeChange = useCallback(
    (authType: McpFormAuthType): void => {
      onPatch({ authType });
    },
    [onPatch],
  );

  return (
    <View className="gap-3" testID={testID}>
      <View className="gap-2">
        <Text className="font-body text-sm font-medium text-card-foreground">
          Auth Type
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Auth Type"
          className="flex-row gap-2"
        >
          {AUTH_TYPE_OPTIONS.map((option) => (
            <AuthTypeOptionButton
              key={option.value}
              option={option}
              isSelected={form.authType === option.value}
              onSelect={handleAuthTypeChange}
            />
          ))}
        </View>
      </View>

      {AUTH_FIELDS[form.authType].map((spec) => (
        <AuthField
          key={spec.key}
          spec={spec}
          value={form[spec.key]}
          error={errors?.[spec.key]}
          onPatch={onPatch}
        />
      ))}
    </View>
  );
};
