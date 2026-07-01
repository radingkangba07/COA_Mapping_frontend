import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface ScopeSectionCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  testID?: string;
}

export const ScopeSectionCard = ({
  title,
  description,
  children,
  className,
  testID,
}: ScopeSectionCardProps): React.JSX.Element => {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <View
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      testID={testID}
    >
      <Text className="font-heading text-base font-semibold text-card-foreground">
        {title}
      </Text>

      {description !== undefined ? (
        <Text className="font-body text-sm text-muted-foreground mt-1">
          {description}
        </Text>
      ) : null}

      {hasChildren ? (
        <View className="mt-3">{children}</View>
      ) : (
        <Text className="font-body text-sm text-muted-foreground mt-3">
          Coming soon
        </Text>
      )}
    </View>
  );
};
