import React from 'react';
import { View, Text } from 'react-native';

interface SummaryRowProps {
  readonly label: string;
  readonly value: string | number;
  readonly testID?: string;
}

export const SummaryRow = ({
  label,
  value,
  testID,
}: SummaryRowProps): React.JSX.Element => (
  <View
    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}
    testID={testID}
  >
    <Text className="font-body text-sm text-muted-foreground" style={{ flex: 1 }} numberOfLines={2}>
      {label}
    </Text>
    <Text
      className="font-body text-sm text-foreground"
      style={{ textAlign: 'right', flexShrink: 0 }}
      numberOfLines={2}
    >
      {String(value)}
    </Text>
  </View>
);
