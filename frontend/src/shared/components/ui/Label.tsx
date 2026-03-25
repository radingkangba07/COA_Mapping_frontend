import React from 'react';
import { Text, type TextProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface LabelProps extends TextProps {
  className?: string;
  testID?: string;
}

export const Label = React.forwardRef<Text, LabelProps>(
  ({ className, children, testID, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn('font-body text-sm font-medium text-foreground', className)}
      testID={testID}
      {...props}
    >
      {children}
    </Text>
  ),
);

Label.displayName = 'Label';
