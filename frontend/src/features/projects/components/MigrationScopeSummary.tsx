import React from 'react';
import { View, Text } from 'react-native';

interface MigrationScopeSummaryProps {
  readonly masterDataCount: number;
  readonly masterDataTotal: number;
  readonly openingBalancesCount: number;
  readonly openingBalancesTotal: number;
  readonly testID?: string;
}

export function MigrationScopeSummary({
  masterDataCount,
  masterDataTotal,
  openingBalancesCount,
  openingBalancesTotal,
  testID,
}: MigrationScopeSummaryProps): React.JSX.Element {
  return (
    <View className="gap-2" testID={testID}>
      <View className="flex-row items-center justify-between">
        <Text className="font-body text-sm text-muted-foreground">
          Master Data
        </Text>
        <Text
          className="font-mono text-sm text-foreground"
          testID={testID !== undefined ? `${testID}-master-data` : undefined}
        >
          {`${masterDataCount} of ${masterDataTotal}`}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="font-body text-sm text-muted-foreground">
          Opening Balances
        </Text>
        <Text
          className="font-mono text-sm text-foreground"
          testID={
            testID !== undefined ? `${testID}-opening-balances` : undefined
          }
        >
          {`${openingBalancesCount} of ${openingBalancesTotal}`}
        </Text>
      </View>
    </View>
  );
}
