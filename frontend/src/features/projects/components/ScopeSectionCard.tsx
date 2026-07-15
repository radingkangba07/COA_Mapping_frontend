import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface ScopeSectionCardProps {
  title: string;
  description?: string;
  headerRight?: React.ReactNode;
  /** 'end' pins headerRight to the far edge; 'inline' places it right after the title text. */
  headerRightPosition?: 'end' | 'inline';
  /** 'below' stacks the description under the title; 'inline' places it right after the title text. */
  descriptionPosition?: 'below' | 'inline';
  children?: React.ReactNode;
  className?: string;
  testID?: string;
}

export const ScopeSectionCard = ({
  title,
  description,
  headerRight,
  headerRightPosition = 'end',
  descriptionPosition = 'below',
  children,
  className,
  testID,
}: ScopeSectionCardProps): React.JSX.Element => {
  const hasChildren = React.Children.count(children) > 0;

  const titleText = (
    <Text className="font-heading text-base font-semibold text-card-foreground">
      {title}
    </Text>
  );

  const titleBlock =
    description !== undefined && descriptionPosition === 'inline' ? (
      <View className="flex-row flex-wrap items-baseline gap-2">
        {titleText}
        <Text className="font-body text-sm text-muted-foreground">
          {description}
        </Text>
      </View>
    ) : (
      <>
        {titleText}
        {description !== undefined ? (
          <Text className="font-body text-sm text-muted-foreground mt-1">
            {description}
          </Text>
        ) : null}
      </>
    );

  return (
    <View
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
      testID={testID}
    >
      {headerRight !== undefined ? (
        <View
          className={
            headerRightPosition === 'inline'
              ? 'flex-row items-center gap-4'
              : 'flex-row items-start gap-4'
          }
        >
          <View className={headerRightPosition === 'inline' ? undefined : 'flex-1'}>
            {titleBlock}
          </View>
          {headerRight}
        </View>
      ) : (
        titleBlock
      )}

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
