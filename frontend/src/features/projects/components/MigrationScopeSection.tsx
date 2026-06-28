import React from 'react';
import { View, Text } from 'react-native';
import { Divider } from '@/shared/components/ui/Divider';
import { MasterDataTable } from './MasterDataTable';
import { OpeningBalancesChecklist } from './OpeningBalancesChecklist';
import type {
  MasterDataRowVM,
  OpeningBalanceRowVM,
} from '../hooks/useMigrationScopeViewModel';
import type { MasterDataColumn } from './MigrationScope.config';

interface MigrationScopeSectionProps {
  readonly masterData: readonly MasterDataRowVM[];
  readonly masterDataCount: number;
  readonly masterDataTotal: number;
  readonly onToggleMasterDataColumn: (
    id: string,
    column: MasterDataColumn,
  ) => void;
  readonly openingBalances: readonly OpeningBalanceRowVM[];
  readonly openingBalancesCount: number;
  readonly openingBalancesTotal: number;
  readonly onToggleOpeningBalance: (id: string) => void;
  readonly testID?: string;
}

export function MigrationScopeSection({
  masterData,
  masterDataCount,
  masterDataTotal,
  onToggleMasterDataColumn,
  openingBalances,
  openingBalancesCount,
  openingBalancesTotal,
  onToggleOpeningBalance,
  testID,
}: MigrationScopeSectionProps): React.JSX.Element {
  return (
    <View className="gap-6" testID={testID}>
      <View className="gap-4">
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-heading text-base font-semibold text-card-foreground">
              Master Data
            </Text>
            <Text
              className="font-mono text-xs text-muted-foreground"
              testID={
                testID !== undefined ? `${testID}-md-counter` : undefined
              }
            >
              {`${masterDataCount} of ${masterDataTotal} selected`}
            </Text>
          </View>
          <Text className="font-body text-sm text-muted-foreground">
            Select which records to convert and master.
          </Text>
        </View>

        <MasterDataTable
          rows={masterData}
          onToggleColumn={onToggleMasterDataColumn}
          testID={testID !== undefined ? `${testID}-master-data` : undefined}
        />
      </View>

      <Divider />

      <View className="gap-4">
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-heading text-base font-semibold text-card-foreground">
              Opening Balances
            </Text>
            <Text
              className="font-mono text-xs text-muted-foreground"
              testID={
                testID !== undefined ? `${testID}-ob-counter` : undefined
              }
            >
              {`${openingBalancesCount} of ${openingBalancesTotal} selected`}
            </Text>
          </View>
          <Text className="font-body text-sm text-muted-foreground">
            Select which opening balances to migrate.
          </Text>
        </View>

        <OpeningBalancesChecklist
          items={openingBalances}
          onToggle={onToggleOpeningBalance}
          testID={
            testID !== undefined ? `${testID}-opening-balances` : undefined
          }
        />
      </View>
    </View>
  );
}
