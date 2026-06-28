import React from 'react';
import { View, Text } from 'react-native';
import { MasterDataTable } from './MasterDataTable';
import type { MasterDataRowVM } from '../hooks/useMigrationScopeViewModel';
import type { MasterDataColumn } from './MigrationScope.config';

interface MigrationScopeSectionProps {
  readonly masterData: readonly MasterDataRowVM[];
  readonly onToggleMasterDataColumn: (
    id: string,
    column: MasterDataColumn,
  ) => void;
  readonly testID?: string;
}

export function MigrationScopeSection({
  masterData,
  onToggleMasterDataColumn,
  testID,
}: MigrationScopeSectionProps): React.JSX.Element {
  return (
    <View className="gap-4" testID={testID}>
      <View className="gap-1">
        <Text className="font-heading text-base font-semibold text-card-foreground">
          Master Data
        </Text>
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
  );
}
