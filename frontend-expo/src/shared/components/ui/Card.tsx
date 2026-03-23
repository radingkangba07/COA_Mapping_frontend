import React from 'react';
import { View, Text, type ViewProps, type TextProps } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface CardRootProps extends ViewProps {
  className?: string;
  testID?: string;
}

const CardRoot = React.forwardRef<View, CardRootProps>(
  ({ className, children, testID, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('rounded-lg border border-border bg-card shadow-sm', className)}
      testID={testID}
      {...props}
    >
      {children}
    </View>
  ),
);
CardRoot.displayName = 'Card';

interface CardSectionProps extends ViewProps {
  className?: string;
}

const CardHeader = React.forwardRef<View, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('p-6 pb-0', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
CardHeader.displayName = 'CardHeader';

interface CardTextProps extends TextProps {
  className?: string;
}

const CardTitle = React.forwardRef<Text, CardTextProps>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn('font-heading text-lg font-semibold text-card-foreground', className)}
      {...props}
    >
      {children}
    </Text>
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<Text, CardTextProps>(
  ({ className, children, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </Text>
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<View, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<View, CardSectionProps>(
  ({ className, children, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('flex-row items-center p-6 pt-0', className)}
      {...props}
    >
      {children}
    </View>
  ),
);
CardFooter.displayName = 'CardFooter';

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
