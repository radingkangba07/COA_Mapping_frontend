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
      className="flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-3"
      testID={testID}
    >
      <View className="gap-2 rounded-lg border border-border bg-card p-2 lg:flex-1">
        <View className="w-[calc(100%+16px)] -ml-2 gap-0.5 border-b border-border px-2 pb-1">
          <View className="flex-row items-center">
            <Text className="w-[30%] font-heading text-base font-semibold text-card-foreground">
              Master Data
            </Text>
            <View className="w-[70%] items-start">
              <Badge
                variant="outline"
                className="rounded-md border-0 bg-[#E9EAF7] px-2 py-1"
                textClassName="text-[#003399]"
                testID={testID !== undefined ? `${testID}-md-counter` : undefined}
              >
                {`${masterDataCount} of ${masterDataTotal} selected`}
              </Badge>
            </View>
          </View>
        </View>

        <View className="pb-2">
          <MasterDataTable
            rows={masterData}
            onToggleColumn={onToggleMasterDataColumn}
            testID={testID !== undefined ? `${testID}-master-data` : undefined}
          />
        </View>
      </View>

      <View className="gap-2 rounded-lg border border-border bg-card p-2 lg:flex-1 lg:flex-col">
        <View className="w-[calc(100%+16px)] -ml-2 gap-0.5 border-b border-border px-2 pb-1">
          <View className="flex-row items-center">
            <Text className="w-[40%] font-heading text-base font-semibold text-card-foreground">
              Opening Balances
            </Text>
            <View className="w-[60%] items-start">
              <Badge
                variant="outline"
                className="rounded-md border-0 bg-[#E9EAF7] px-2 py-1"
                textClassName="text-[#003399]"
                testID={testID !== undefined ? `${testID}-ob-counter` : undefined}
              >
                {`${openingBalancesCount} of ${openingBalancesTotal} selected`}
              </Badge>
            </View>
          </View>
        </View>

        <View className="pb-2">
          <OpeningBalancesChecklist
            items={openingBalances}
            onToggle={onToggleOpeningBalance}
            testID={
              testID !== undefined ? `${testID}-opening-balances` : undefined
            }
          />
        </View>

        <View style={{ flex: 1 }} />

        <View
          className="flex-row items-start gap-3 rounded-lg p-3"
          style={{ backgroundColor: `${colors.primary}1A` }}
        >
          <Info size={18} color={colors.primary} strokeWidth={2.5} style={{ marginTop: 2 }} />
          <Text className="font-body flex-1 text-xs leading-5" style={{ color: colors.primary }}>
            Opening balances will be validated during the mapping step.
          </Text>
        </View>
      </View>
    </View>
  );
}
