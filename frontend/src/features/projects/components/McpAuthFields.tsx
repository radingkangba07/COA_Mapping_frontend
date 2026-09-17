import React, { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { RadioGroup } from '@/shared/components/ui/RadioGroup';
import type {
  McpConnectionForm,
  McpFormAuthType,
} from '../services/mcp.service';
import { useOAuth2Flow } from '../hooks/useOAuth2Flow';
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

  const handleTokenReceived = useCallback(
    (token: string): void => {
      onPatch({ token });
    },
    [onPatch],
  );

  const { status: oauthStatus, error: oauthError, connect, reset: resetOAuth } = useOAuth2Flow(handleTokenReceived);

  // Derive connected state from the form token value — this means a page
  // refresh (which clears form.token back to '') correctly shows the connect
  // button rather than a stale "connected" indicator from hook state.
  const isOAuthConnected = form.authType === 'oauth2' && form.token !== '';

  // Track the OAuth-relevant fields so we can invalidate the token when any
  // of them change (credential rotation, URL correction, etc.).
  const prevOAuthKeyRef = useRef(`${form.clientId}|${form.clientSecret}|${form.url}`);
  useEffect(() => {
    if (form.authType !== 'oauth2') return;
    const next = `${form.clientId}|${form.clientSecret}|${form.url}`;
    if (next !== prevOAuthKeyRef.current) {
      prevOAuthKeyRef.current = next;
      if (form.token !== '') {
        onPatch({ token: '' });
        resetOAuth();
      }
    }
  }, [form.authType, form.clientId, form.clientSecret, form.url, form.token, onPatch, resetOAuth]);

  const handleOAuthConnect = useCallback((): void => {
    void connect(form.clientId, form.clientSecret, form.url);
  }, [connect, form.clientId, form.clientSecret, form.url]);

  const handleOAuthReset = useCallback((): void => {
    onPatch({ token: '' });
    resetOAuth();
  }, [onPatch, resetOAuth]);

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

      {form.authType === 'oauth2' && (
        <View className="gap-2">
          {isOAuthConnected ? (
            <View className="flex-row items-center justify-between rounded-md border border-green-500 bg-green-50 px-3 py-2">
              <Text className="font-body text-sm font-medium text-green-700">
                Connected — authorisation complete
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={handleOAuthReset}
                testID="mcp-oauth2-reset-btn"
              >
                Re-authenticate
              </Button>
            </View>
          ) : (
            <Button
              variant="outline"
              onPress={handleOAuthConnect}
              disabled={oauthStatus === 'connecting'}
              testID="mcp-oauth2-connect-btn"
            >
              {oauthStatus === 'connecting' ? 'Waiting for authorisation…' : 'Connect with NetSuite'}
            </Button>
          )}
          {oauthStatus === 'error' && oauthError != null && (
            <Text className="font-body text-xs text-destructive">{oauthError}</Text>
          )}
          {errors?.token != null && !isOAuthConnected && (
            <Text className="font-body text-xs text-destructive">{errors.token}</Text>
          )}
        </View>
      )}

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
