import { Text, View } from 'react-native';
import { Button } from '@/shared/components/ui/Button';
import { useTestConnectionViewModel } from '../hooks/useTestConnectionViewModel';
import type { McpConnectionForm } from '../services/mcp.service';
import { TestConnectionFailurePanel } from './TestConnectionFailurePanel';
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

  return (
    <View className="gap-3" testID={testID}>
      <Button
        onPress={vm.onTestConnection}
        disabled={!vm.canTest}
        isLoading={vm.isTesting}
        testID="test-connection-button"
        accessibilityLabel="Test connection"
      >
        Test Connection
      </Button>

      {vm.status === 'success' && vm.connectedAt !== null ? (
        <TestConnectionSuccessPanel connectedAt={vm.connectedAt} />
      ) : vm.status === 'failure' ? (
        <TestConnectionFailurePanel
          message={vm.error ?? ''}
          onRetry={vm.onTestConnection}
          isRetrying={vm.isTesting}
        />
      ) : vm.error !== null ? (
        <Text
          className="font-body text-xs text-destructive"
          testID="test-connection-inline-error"
        >
          {vm.error}
        </Text>
      ) : null}
    </View>
  );
};
