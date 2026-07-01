import { useState } from 'react';
import { Text, View } from 'react-native';
import { Play } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';
import { useTestConnectionViewModel } from '../hooks/useTestConnectionViewModel';
import type { McpConnectionForm } from '../services/mcp.service';
import { TestConnectionFailurePanel } from './TestConnectionFailurePanel';
import { TestConnectionLogsDrawer } from './TestConnectionLogsDrawer';
import { TestConnectionSuccessPanel } from './TestConnectionSuccessPanel';

interface TestConnectionFlowProps {
  readonly connection: McpConnectionForm;
  readonly testID?: string;
}

export const TestConnectionFlow = ({
  connection,
  testID = 'test-connection-flow',
}: TestConnectionFlowProps) => {
  const vm = useTestConnectionViewModel(connection);
  const [logsOpen, setLogsOpen] = useState(false);

  return (
    <View className="gap-3" testID={testID}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-heading text-base font-semibold text-card-foreground">
            Test Connection
          </Text>
          <Text className="font-body text-sm text-muted-foreground">
            Test the connection to ensure the MCP server is reachable.
          </Text>
        </View>
        <Button
          onPress={vm.onTestConnection}
          disabled={!vm.canTest}
          isLoading={vm.isTesting}
          testID="test-connection-button"
          accessibilityLabel="Test connection"
        >
          <View className="flex-row items-center gap-2">
            <Play size={16} color={colors.primaryForeground} />
            <Text className="font-body text-sm font-medium text-primary-foreground">
              Test Connection
            </Text>
          </View>
        </Button>
      </View>

      {vm.status === 'success' && vm.connectedAt !== null ? (
        <TestConnectionSuccessPanel
          connectedAt={vm.connectedAt}
          onViewLogs={
            vm.logs.length > 0 ? () => setLogsOpen(true) : undefined
          }
        />
      ) : vm.status === 'failure' ? (
        <>
          <TestConnectionFailurePanel
            message={vm.error ?? ''}
            onRetry={vm.onTestConnection}
            isRetrying={vm.isTesting}
          />
          {vm.logs.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setLogsOpen(true)}
              testID="test-connection-view-logs-button"
              accessibilityLabel="View logs"
            >
              View Logs
            </Button>
          ) : null}
        </>
      ) : vm.error !== null ? (
        <Text
          className="font-body text-xs text-destructive"
          testID="test-connection-inline-error"
        >
          {vm.error}
        </Text>
      ) : null}

      <TestConnectionLogsDrawer
        visible={logsOpen}
        logs={vm.logs}
        onClose={() => setLogsOpen(false)}
      />
    </View>
  );
};
