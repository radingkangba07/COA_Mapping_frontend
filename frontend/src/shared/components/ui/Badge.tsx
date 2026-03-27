import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils/string.utils';

const badgeVariants = cva(
  'flex-row items-center rounded-full px-3 py-1',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        destructive: 'bg-destructive',
        outline: 'border border-border bg-background',
        success: 'bg-success',
        warning: 'bg-warning',
        accent: 'bg-accent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      success: 'text-success-foreground',
      warning: 'text-warning-foreground',
      accent: 'text-accent-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BadgeVariantProps = VariantProps<typeof badgeVariants>;

interface BadgeProps extends Omit<ViewProps, 'children'> {
  variant?: BadgeVariantProps['variant'];
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  testID?: string;
}

export const Badge = React.forwardRef<View, BadgeProps>(
  ({ variant = 'default', children, className, textClassName, testID, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      testID={testID}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={cn(badgeTextVariants({ variant }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  ),
);

Badge.displayName = 'Badge';
