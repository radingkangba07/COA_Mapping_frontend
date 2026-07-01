import React from 'react';
import { View, Text } from 'react-native';

interface ScopeSectionCardProps {
  title: string;
  description?: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
}

export const ScopeSectionCard = ({
  title,
  description,
  headerRight,
  children,
  testID,
}: ScopeSectionCardProps): React.JSX.Element => {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <View
      className="rounded-lg border border-border bg-card p-4"
      testID={testID}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="font-heading text-base font-semibold text-card-foreground">
            {title}
          </Text>

          {description !== undefined ? (
            <Text className="font-body text-sm text-muted-foreground mt-1">
              {description}
            </Text>
          ) : null}
        </View>

        {headerRight !== undefined ? headerRight : null}
      </View>

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
