import React from 'react';
import { View } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { type GapSize, type Alignment, GAP_MAP, ALIGN_MAP } from '@/shared/components/layout/layout.constants';

interface StackProps {
  gap?: GapSize;
  align?: Alignment;
  className?: string;
  children: React.ReactNode;
  testID?: string;
}

export const Stack = ({
  gap = 0,
  align,
  className,
  children,
  testID,
}: StackProps): React.JSX.Element => (
  <View
    className={cn(
      'flex-col',
      GAP_MAP[gap],
      align !== undefined && ALIGN_MAP[align],
      className,
    )}
    testID={testID}
  >
    {children}
  </View>
);
