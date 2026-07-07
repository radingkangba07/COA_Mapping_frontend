import React from 'react';
import { View, Text } from 'react-native';
import { Info } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Badge } from '@/shared/components/ui/Badge';
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
    <View
      className="flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6"
      testID={testID}
    >
      <View className="gap-4 rounded-lg border border-border bg-card p-4 lg:flex-1">
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-heading text-base font-semibold text-card-foreground">
              Master Data
            </Text>
            <Badge
              variant="outline"
              testID={testID !== undefined ? `${testID}-md-counter` : undefined}
            >
              {`${masterDataCount} of ${masterDataTotal} selected`}
            </Badge>
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

      <View className="gap-4 rounded-lg border border-border bg-card p-4 lg:flex-1 lg:flex-col">
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-heading text-base font-semibold text-card-foreground">
              Opening Balances
            </Text>
            <Badge
              variant="outline"
              testID={testID !== undefined ? `${testID}-ob-counter` : undefined}
            >
              {`${openingBalancesCount} of ${openingBalancesTotal} selected`}
            </Badge>
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

        <View style={{ flex: 1 }} />

        <View
          className="flex-row items-start gap-2 rounded-lg px-3 py-2.5"
          style={{ backgroundColor: `${colors.primary}1A` }}
        >
          <Info size={14} color={colors.primary} strokeWidth={2.5} style={{ marginTop: 2 }} />
          <Text className="font-body flex-1 text-xs leading-5" style={{ color: colors.primary }}>
            Opening balances will be validated during the mapping step.
          </Text>
        </View>
      </View>
    </View>
  );
}
