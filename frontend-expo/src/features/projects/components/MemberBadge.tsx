import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/shared/utils/string.utils';

interface MemberBadgeProps {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
  testID?: string;
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
} as const;

const TEXT_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
} as const;

export const MemberBadge = ({
  name,
  size = 'md',
  className,
  testID,
}: MemberBadgeProps): React.JSX.Element => {
  const initial = name.length > 0 ? name.charAt(0).toUpperCase() : '?';

  return (
    <View
      className={cn(
        'items-center justify-center rounded-full bg-primary',
        SIZE_CLASSES[size],
        className,
      )}
      testID={testID}
    >
      <Text
        className={cn(
          'font-heading font-semibold text-primary-foreground',
          TEXT_SIZE_CLASSES[size],
        )}
      >
        {initial}
      </Text>
    </View>
  );
};
