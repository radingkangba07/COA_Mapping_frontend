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
      className="flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2"
      testID={testID}
    >
      <View className="gap-2 rounded-lg border border-border bg-card p-2 lg:grow lg:basis-[80px]">
        <View className="pb-2">
          <MasterDataTable
            rows={masterData}
            onToggleColumn={onToggleMasterDataColumn}
            counter={
              <Badge
                variant="outline"
                className="rounded-md border-0 bg-primary/10 px-2 py-1"
                textClassName="text-primary"
                testID={testID !== undefined ? `${testID}-md-counter` : undefined}
              >
                {`${masterDataCount} of ${masterDataTotal} selected`}
              </Badge>
            }
            testID={testID !== undefined ? `${testID}-master-data` : undefined}
          />
        </View>
      </View>

      {/* Master Data grows by the arrow-zone width (80px) so Opening Balances
          starts exactly where the Target ERP card starts in the section above. */}
      <View className="gap-2 rounded-lg border border-border bg-card p-2 lg:flex-1 lg:flex-col">
        <View className="pb-2">
          <OpeningBalancesChecklist
            items={openingBalances}
            onToggle={onToggleOpeningBalance}
            counter={
              <Badge
                variant="outline"
                className="rounded-md border-0 bg-primary/10 px-2 py-1"
                textClassName="text-primary"
                testID={testID !== undefined ? `${testID}-ob-counter` : undefined}
              >
                {`${openingBalancesCount} of ${openingBalancesTotal} selected`}
              </Badge>
            }
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
