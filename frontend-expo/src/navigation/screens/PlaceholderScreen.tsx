import React from 'react';
import { View, Text } from 'react-native';

interface PlaceholderScreenProps {
  name: string;
  testID?: string;
}

export const PlaceholderScreen = ({
  name,
  testID,
}: PlaceholderScreenProps): React.JSX.Element => (
  <View className="flex-1 items-center justify-center bg-background" testID={testID}>
    <Text className="text-lg font-semibold text-foreground">{name}</Text>
    <Text className="mt-2 text-sm text-muted-foreground">Coming soon</Text>
  </View>
);
