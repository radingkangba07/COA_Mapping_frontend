import { useMemo } from 'react';
import { Text } from 'react-native';
import { Sheet } from '@/shared/components/ui/Sheet';
import { ScrollArea } from '@/shared/components/ui/ScrollArea';
import { redactLogs } from '@/shared/utils/redact.utils';

interface TestConnectionLogsDrawerProps {
  readonly visible: boolean;
  readonly logs: readonly string[];
  readonly onClose: () => void;
  readonly testID?: string;
}

export const TestConnectionLogsDrawer = ({
  visible,
  logs,
  onClose,
  testID = 'test-connection-logs-drawer',
}: TestConnectionLogsDrawerProps) => {
  const redacted = useMemo(() => redactLogs([...logs]), [logs]);

  return (
    <Sheet visible={visible} onClose={onClose} testID={testID}>
      <Sheet.Header>
        <Sheet.Title>Connection Logs</Sheet.Title>
        <Sheet.Close onPress={onClose} testID="test-connection-logs-close" />
      </Sheet.Header>

      <Sheet.Content>
        {redacted.length === 0 ? (
          <Text
            className="font-body text-sm text-muted-foreground"
            testID="test-connection-logs-empty"
          >
            No logs available.
          </Text>
        ) : (
          <ScrollArea maxHeight={320} className="gap-1">
            {redacted.map((line, index) => (
              <Text
                key={index}
                className="font-mono text-xs text-foreground"
                testID={`test-connection-log-line-${index}`}
              >
                {line}
              </Text>
            ))}
          </ScrollArea>
        )}
      </Sheet.Content>
    </Sheet>
  );
};
