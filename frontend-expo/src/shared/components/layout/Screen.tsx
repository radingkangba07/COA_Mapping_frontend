import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';

const SCROLL_CONTENT_STYLE = { flexGrow: 1 } as const;

interface ScreenProps {
  scroll?: boolean;
  className?: string;
  children: React.ReactNode;
  testID?: string;
}

export const Screen = ({
  scroll = false,
  className,
  children,
  testID,
}: ScreenProps): React.JSX.Element => {
  const content = isWeb ? (
    <View className="mx-auto w-full max-w-7xl flex-1">{children}</View>
  ) : (
    children
  );

  return (
    <SafeAreaView
      className={cn('flex-1 bg-background', className)}
      testID={testID}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={SCROLL_CONTENT_STYLE}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};
