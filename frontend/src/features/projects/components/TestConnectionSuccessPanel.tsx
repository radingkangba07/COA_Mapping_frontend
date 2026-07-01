import { Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';
import { formatDateTime } from '@/shared/utils/date.utils';

interface TestConnectionSuccessPanelProps {
  readonly connectedAt: string;
  readonly onViewLogs?: () => void;
  readonly testID?: string;
}

function formatConnectedAt(connectedAt: string): string {
  const parsed = new Date(connectedAt);
  if (Number.isNaN(parsed.getTime())) {
    return connectedAt;
  }
  return formatDateTime(parsed);
}

export const TestConnectionSuccessPanel = ({
  connectedAt,
  onViewLogs,
  testID = 'test-connection-success',
}: TestConnectionSuccessPanelProps) => {
  const formatted = formatConnectedAt(connectedAt);

  return (
    <View
      className="flex-row items-center gap-3 rounded-md border border-success/30 bg-success/10 p-3"
      testID={testID}
    >
      <CheckCircle2 size={18} color={colors.success ?? colors.primary} />
      <View className="flex-1">
        <Text className="font-body text-sm font-semibold text-success">
          Connection successful
        </Text>
        <Text
          className="font-body text-xs text-success"
          testID="test-connection-success-message"
        >
          Connected on {formatted}
        </Text>
      </View>
      {onViewLogs !== undefined ? (
        <Button
          variant="link"
          size="sm"
          onPress={onViewLogs}
          textClassName="text-success"
          testID="test-connection-view-logs-button"
          accessibilityLabel="View logs"
        >
          View Logs
        </Button>
      ) : null}
    </View>
  );
};
