import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/config/theme';

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
    <Text style={{ fontSize: 12, color: colors.mutedForeground, flex: 1 }} numberOfLines={2}>
      {label}
    </Text>
    <Text
      style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, textAlign: 'right', flexShrink: 0 }}
      numberOfLines={2}
    >
      {String(value)}
    </Text>
  </View>
);
