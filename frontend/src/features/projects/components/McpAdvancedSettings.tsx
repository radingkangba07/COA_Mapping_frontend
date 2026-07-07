// Advanced (connection-global) MCP settings group (DA-66).
// Presentational: props in / callbacks out, no store access.
// Skip SSL Verification + Enable Proxy + Request Timeout (seconds).

import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { Info } from 'lucide-react-native';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { Input } from '@/shared/components/ui/Input';
import { colors } from '@/config/theme';
import { DEFAULT_TIMEOUT_SECONDS } from '../services/mcp.service';

const INFO_ICON_SIZE = 14;

const SKIP_SSL_TOOLTIP =
  'Disables TLS certificate validation. Insecure — use for local development only.';
const PROXY_TOOLTIP =
  'Routes connection requests through a configured proxy server.';
const TIMEOUT_TOOLTIP =
  'Maximum seconds to wait before the connection attempt fails.';

interface McpAdvancedSettingsProps {
  skipSSL: boolean;
  proxy: boolean;
  timeout: number;
  onPatch: (patch: {
    skipSSL?: boolean;
    proxy?: boolean;
    timeout?: number;
  }) => void;
  testID?: string;
}

interface InfoTooltipProps {
  content: string;
  testID?: string;
}

const InfoTooltip = ({ content, testID }: InfoTooltipProps): React.JSX.Element => (
  <Tooltip content={content} testID={testID}>
    <View accessibilityRole="image" accessibilityLabel={content}>
      <Info size={INFO_ICON_SIZE} color={colors.mutedForeground} />
    </View>
  </Tooltip>
);

function parseTimeoutSeconds(text: string): number {
  const digitsOnly = text.replace(/[^0-9]/g, '');
  if (digitsOnly.length === 0) {
    return 0;
  }
  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export const McpAdvancedSettings = ({
  skipSSL,
  proxy,
  timeout,
  onPatch,
  testID = 'mcp-advanced',
}: McpAdvancedSettingsProps): React.JSX.Element => {
  const handleSkipSSLChange = useCallback(
    (next: boolean): void => {
      onPatch({ skipSSL: next });
    },
    [onPatch],
  );

  const handleProxyChange = useCallback(
    (next: boolean): void => {
      onPatch({ proxy: next });
    },
    [onPatch],
  );

  const handleTimeoutChange = useCallback(
    (text: string): void => {
      onPatch({ timeout: parseTimeoutSeconds(text) });
    },
    [onPatch],
  );

  const timeoutEnabled = timeout > 0;

  const handleTimeoutToggle = useCallback(
    (next: boolean): void => {
      onPatch({ timeout: next ? DEFAULT_TIMEOUT_SECONDS : 0 });
    },
    [onPatch],
  );

  return (
    <View className="gap-4" testID={testID}>
      <Text className="font-heading text-base font-semibold text-card-foreground">
        Additional Settings{' '}
        <Text className="font-body text-sm font-normal text-muted-foreground">
          (Optional)
        </Text>
      </Text>

      <View className="gap-4" testID={`${testID}-body`}>
        <View className="flex-row items-center gap-2">
          <Checkbox
            checked={skipSSL}
            onCheckedChange={handleSkipSSLChange}
            label="Skip SSL Certificate Validation"
            testID="mcp-skip-ssl"
          />
          <InfoTooltip
            content={SKIP_SSL_TOOLTIP}
            testID="mcp-skip-ssl-tooltip"
          />
        </View>

        <View className="flex-row items-center gap-2">
          <Checkbox
            checked={proxy}
            onCheckedChange={handleProxyChange}
            label="Enable Proxy"
            testID="mcp-proxy"
          />
          <InfoTooltip content={PROXY_TOOLTIP} testID="mcp-proxy-tooltip" />
        </View>

        <View className="flex-row items-center gap-2">
          <Checkbox
            checked={timeoutEnabled}
            onCheckedChange={handleTimeoutToggle}
            label="Request Timeout (seconds)"
            testID="mcp-timeout-enabled"
          />
          <InfoTooltip
            content={TIMEOUT_TOOLTIP}
            testID="mcp-timeout-tooltip"
          />
          <View className="w-24">
            <Input
              value={String(timeout)}
              onChangeText={handleTimeoutChange}
              editable={timeoutEnabled}
              keyboardType="numeric"
              autoCapitalize="none"
              testID="mcp-timeout"
            />
          </View>
        </View>
      </View>
    </View>
  );
};
