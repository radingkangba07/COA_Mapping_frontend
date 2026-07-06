import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/config/theme';

interface ProgressBarProps {
  readonly value: number;       // 0–100
  readonly showLabel?: boolean;
  readonly testID?: string;
}

export const ProgressBar = ({
  value,
  showLabel = false,
  testID,
}: ProgressBarProps): React.JSX.Element => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      testID={testID}
    >
      <View
        style={{
          flex: 1,
          height: 6,
          backgroundColor: colors.muted,
          borderRadius: 99,
          overflow: 'hidden',
        }}
        testID={testID ? `${testID}-track` : undefined}
      >
        <View
          style={{
            height: 6,
            width: `${clamped}%`,
            backgroundColor: colors.primary,
            borderRadius: 99,
            minWidth: clamped > 0 ? 6 : 0,
          }}
          testID={testID ? `${testID}-fill` : undefined}
        />
      </View>

      {showLabel && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: clamped > 0 ? colors.primary : colors.mutedForeground,
            minWidth: 28,
          }}
        >
          {clamped}%
        </Text>
      )}
    </View>
  );
};
