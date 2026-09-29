import React from 'react';
import { View } from 'react-native';
import { colors } from '@/config/theme';
import type { ImportRunDto } from '../services/test_import.service';
import { StatTile } from './StatTile';

export function StatStrip({ run }: { run: ImportRunDto }): React.JSX.Element {
  const attempted = run.rows_attempted ?? 0;
  const imported = run.rows_imported ?? 0;
  const failed = run.rows_failed ?? 0;
  const skipped = run.rows_skipped ?? 0;
  const reconciled = run.rows_reconciled ?? 0;

  return (
    <View className="flex-row gap-2 flex-wrap">
      <StatTile label="Attempted" value={String(attempted)} />
      <StatTile
        label="Imported"
        value={String(imported)}
        color={imported > 0 ? colors.success : undefined}
      />
      <StatTile
        label="Failed"
        value={String(failed)}
        color={failed > 0 ? colors.destructive : undefined}
      />
      <StatTile label="Skipped" value={String(skipped)} />
      <StatTile
        label="Reconciled"
        value={imported > 0 ? `${String(reconciled)} / ${String(imported)}` : String(reconciled)}
        color={reconciled > 0 ? colors.success : undefined}
      />
    </View>
  );
}
