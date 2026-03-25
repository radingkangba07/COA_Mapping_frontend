import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/string.utils';

const progressTrackVariants = cva('w-full overflow-hidden rounded-full bg-secondary', {
  variants: {
    size: {
      sm: 'h-1',
      default: 'h-2',
      lg: 'h-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const progressFillVariants = cva('h-full rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type ProgressVariantProps = VariantProps<typeof progressTrackVariants> &
  VariantProps<typeof progressFillVariants>;

interface ProgressProps extends Omit<ViewProps, 'children'> {
  value?: number;
  variant?: ProgressVariantProps['variant'];
  size?: ProgressVariantProps['size'];
  showLabel?: boolean;
  className?: string;
  testID?: string;
}

export const Progress = React.forwardRef<View, ProgressProps>(
  (
    {
      value = 0,
      variant = 'default',
      size = 'default',
      showLabel = false,
      className,
      testID,
      ...props
    },
    ref,
  ) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <View ref={ref} className={cn('w-full', className)} testID={testID} {...props}>
        <View className={cn(progressTrackVariants({ size }))}>
          <View
            className={cn(progressFillVariants({ variant }))}
            style={{ width: `${clampedValue}%` }}
            testID={testID ? `${testID}-fill` : undefined}
          />
        </View>
        {showLabel && (
          <Text className="mt-1 text-xs text-muted-foreground">
            {clampedValue}%
          </Text>
        )}
      </View>
    );
  },
);

Progress.displayName = 'Progress';
