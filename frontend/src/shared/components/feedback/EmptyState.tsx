import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/shared/utils/string.utils';
import { Button } from '@/shared/components/ui/Button';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
  testID?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
  testID,
}: EmptyStateProps): React.JSX.Element => (
  <View
    className={cn('flex-1 items-center justify-center px-6 py-12', className)}
    testID={testID}
  >
    {icon !== undefined && <View className="mb-4">{icon}</View>}
    <Text className="text-center font-heading text-xl font-semibold text-foreground">
      {title}
    </Text>
    {description !== undefined && description.length > 0 && (
      <Text className="mt-2 text-center font-body text-sm text-muted-foreground">
        {description}
      </Text>
    )}
    {action !== undefined && (
      <View className="mt-6">
        <Button onPress={action.onPress} testID={`${testID ?? 'empty-state'}-action`}>
          {action.label}
        </Button>
      </View>
    )}
  </View>
);
