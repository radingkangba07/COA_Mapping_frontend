import React from 'react';
import { View, Text } from 'react-native';
import { Lock } from 'lucide-react-native';

export function ReadOnlyBanner(): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 mb-4">
      <Lock size={14} color="#92400E" />
      <Text className="font-body text-sm text-amber-800 dark:text-amber-300">
        View Only — This project has been completed and cannot be edited.
      </Text>
    </View>
  );
}
