import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '@/config/theme';

export interface MigrationTopBarProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly onBack: () => void;
  readonly rightActions?: React.ReactNode;
  readonly testID?: string;
}

export const MigrationTopBar = React.memo(
  ({ title, subtitle, onBack, rightActions, testID }: MigrationTopBarProps): React.JSX.Element => {
    return (
      <View
        className="h-14 flex-row items-center border-b border-border bg-background px-4"
        testID={testID}
      >
        {/* Left: Back button */}
        <Pressable
          onPress={onBack}
          className="flex-row items-center"
          testID={testID ? `${testID}-back` : undefined}
        >
          <ArrowLeft size={16} color={colors.primary} />
          <Text className="ml-1 font-body text-sm text-primary">Dashboard</Text>
        </Pressable>

        {/* Center: Title + subtitle */}
        <View className="flex-1 items-center">
          <Text className="font-heading text-base font-semibold text-foreground">{title}</Text>
          {subtitle ? (
            <Text className="font-body text-xs text-muted-foreground">{subtitle}</Text>
          ) : null}
        </View>

        {/* Right: Actions or spacer for balance */}
        {rightActions ?? <View style={{ width: 16 }} />}
      </View>
    );
  },
);

MigrationTopBar.displayName = 'MigrationTopBar';
