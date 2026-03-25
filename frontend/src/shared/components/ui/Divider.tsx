import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

type DividerOrientation = 'horizontal' | 'vertical';
type DividerSpacing = '0' | '1' | '2' | '3' | '4' | '6' | '8';

const HORIZONTAL_SPACING: Record<DividerSpacing, string> = {
  '0': '',
  '1': 'my-1',
  '2': 'my-2',
  '3': 'my-3',
  '4': 'my-4',
  '6': 'my-6',
  '8': 'my-8',
};

const VERTICAL_SPACING: Record<DividerSpacing, string> = {
  '0': '',
  '1': 'mx-1',
  '2': 'mx-2',
  '3': 'mx-3',
  '4': 'mx-4',
  '6': 'mx-6',
  '8': 'mx-8',
};

interface DividerProps extends ViewProps {
  orientation?: DividerOrientation;
  spacing?: DividerSpacing;
  className?: string;
  testID?: string;
}

export const Divider = React.forwardRef<View, DividerProps>(
  (
    {
      orientation = 'horizontal',
      spacing = '0',
      className,
      testID,
      ...props
    },
    ref,
  ) => {
    const isHorizontal = orientation === 'horizontal';
    const spacingClass = isHorizontal
      ? HORIZONTAL_SPACING[spacing]
      : VERTICAL_SPACING[spacing];

    return (
      <View
        ref={ref}
        className={cn(
          'bg-border',
          isHorizontal ? 'h-px w-full' : 'w-px h-full',
          spacingClass,
          className,
        )}
        testID={testID}
        {...props}
      />
    );
  },
);

Divider.displayName = 'Divider';
