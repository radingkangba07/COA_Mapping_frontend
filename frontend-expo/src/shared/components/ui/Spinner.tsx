import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

type SpinnerSize = 'sm' | 'md' | 'lg';

const INDICATOR_SIZE: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
  testID?: string;
}

export const Spinner = ({
  size = 'md',
  color = colors.primary,
  className,
  testID,
}: SpinnerProps): React.JSX.Element => {
  const indicatorSize = INDICATOR_SIZE[size];

  return (
    <View
      className={cn('items-center justify-center', className)}
      testID={testID}
    >
      <ActivityIndicator size={indicatorSize} color={color} />
    </View>
  );
};
