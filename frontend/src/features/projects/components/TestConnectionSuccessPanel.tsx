import { Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { formatDateTime } from '@/shared/utils/date.utils';

interface TestConnectionSuccessPanelProps {
  readonly connectedAt: string;
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
  testID = 'test-connection-success',
}: TestConnectionSuccessPanelProps) => {
  const formatted = formatConnectedAt(connectedAt);

  return (
    <View
      className="flex-row items-center gap-2 rounded-md border border-border bg-muted/30 p-3"
      testID={testID}
    >
      <CheckCircle2 size={18} color={colors.success ?? colors.primary} />
      <Text
        className="font-body text-sm text-success"
        testID="test-connection-success-message"
      >
        Connected on {formatted}
      </Text>
    </View>
  );
};
