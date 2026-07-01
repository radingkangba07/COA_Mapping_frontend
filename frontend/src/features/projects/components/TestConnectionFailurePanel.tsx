import { Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';

interface TestConnectionFailurePanelProps {
  readonly message: string;
  readonly onRetry: () => void;
  readonly isRetrying?: boolean;
  readonly testID?: string;
}

const GENERIC_FAILURE_MESSAGE =
  'Connection test failed. Check the connection details and try again.';

export function toActionableMessage(raw: string): string {
  const normalized = raw.toLowerCase();

  if (normalized.includes('401') || normalized.includes('unauthorized')) {
    return 'Authentication failed — check your credentials and try again.';
  }
  if (normalized.includes('403') || normalized.includes('forbidden')) {
    return 'Access denied — the credentials lack permission for this MCP server.';
  }
  if (normalized.includes('404')) {
    return 'MCP server not found — verify the server URL.';
  }
  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('408')
  ) {
    return 'The connection timed out — verify the URL/network or increase the request timeout.';
  }
  if (
    normalized.includes('econnrefused') ||
    normalized.includes('network') ||
    normalized.includes('failed to fetch')
  ) {
    return 'Could not reach the MCP server — check the URL and your network connection.';
  }
  if (normalized.includes('ssl') || normalized.includes('certificate')) {
    return 'TLS/SSL error — verify the certificate or enable Skip SSL in advanced settings.';
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : GENERIC_FAILURE_MESSAGE;
}

export const TestConnectionFailurePanel = ({
  message,
  onRetry,
  isRetrying = false,
  testID = 'test-connection-failure',
}: TestConnectionFailurePanelProps) => {
  const actionable = toActionableMessage(message);

  return (
    <View
      className="gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3"
      testID={testID}
    >
      <View className="flex-row items-start gap-2">
        <AlertCircle size={18} color={colors.destructive} />
        <Text
          className="flex-1 font-body text-sm text-destructive"
          testID="test-connection-failure-message"
        >
          {actionable}
        </Text>
      </View>

      <Button
        variant="outline"
        size="sm"
        onPress={onRetry}
        isLoading={isRetrying}
        disabled={isRetrying}
        testID="test-connection-retry-button"
        accessibilityLabel="Retry connection test"
      >
        Retry
      </Button>
    </View>
  );
};
