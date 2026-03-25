import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/shared/utils/string.utils';

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
  const content = (
    <View className="mx-auto w-full px-4 md:px-6 lg:max-w-7xl lg:px-8 flex-1">
      {children}
    </View>
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
