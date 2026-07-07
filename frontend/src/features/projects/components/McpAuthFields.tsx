import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { Input } from '@/shared/components/ui/Input';
import { RadioGroup } from '@/shared/components/ui/RadioGroup';
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
} from './McpAuthFields.config';

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
      {AUTH_FIELDS[form.authType].map((spec) => (
        <AuthField
          key={spec.key}
          spec={spec}
          value={form[spec.key]}
          error={errors?.[spec.key]}
          onPatch={onPatch}
        />
      ))}

      <View className="gap-2">
        <Text className="font-body text-sm font-medium text-card-foreground">
          Authentication Type
        </Text>
        <RadioGroup
          value={form.authType}
          options={AUTH_TYPE_OPTIONS}
          onChange={handleAuthTypeChange}
          accessibilityLabel="Authentication Type"
          className="flex-row flex-wrap gap-x-6 gap-y-2"
        />
      </View>
    </View>
  );
};
