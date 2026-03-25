import React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface ScrollAreaProps extends ScrollViewProps {
  className?: string;
  maxHeight?: number;
  showsScrollIndicator?: boolean;
  horizontal?: boolean;
  testID?: string;
}

export const ScrollArea = React.forwardRef<ScrollView, ScrollAreaProps>(
  (
    {
      className,
      maxHeight,
      showsScrollIndicator = true,
      horizontal = false,
      style,
      testID,
      ...props
    },
    ref,
  ) => {
    return (
      <ScrollView
        ref={ref}
        className={cn('flex-1', className)}
        style={[maxHeight != null ? { maxHeight } : undefined, style]}
        horizontal={horizontal}
        showsVerticalScrollIndicator={showsScrollIndicator}
        showsHorizontalScrollIndicator={showsScrollIndicator}
        testID={testID}
        {...props}
      />
    );
  },
);

ScrollArea.displayName = 'ScrollArea';
