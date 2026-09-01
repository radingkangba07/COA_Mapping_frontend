import React from 'react';
import { Text, View } from 'react-native';
import { SemanticBadge } from '../SemanticBadge/SemanticBadge';
import { fmt } from '../../utils/fields';
import type { EntityField } from '../../dp-kit/types/entity';

interface InvalidValuesTableProps {
  readonly field: EntityField;
}

/** The reference's 3-column invalid-values grid: Source · canonical | Rows | Status. */
export function InvalidValuesTable({ field }: InvalidValuesTableProps): React.JSX.Element | null {
  const rows = field.invalidTable ?? [];
  if (rows.length === 0) return null;

  return (
    <View className="mt-3">
      <Text className="mb-[9px] font-body text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        Invalid values
      </Text>
      <View className="overflow-hidden rounded-[10px] border border-border">
        <View className="flex-row gap-3 border-b border-border bg-surface px-[11px] py-2">
          <Text className="flex-1 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Source · canonical
          </Text>
          <Text className="w-[58px] text-right font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rows
          </Text>
          <Text className="flex-1 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </Text>
        </View>
        {rows.map((row, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <View key={index} className="flex-row items-center gap-3 border-b border-border px-[11px] py-[9px] last:border-b-0">
            <Text className="flex-1 font-mono text-[11.5px]" numberOfLines={1}>
              <Text className="font-semibold text-foreground">{row.src ?? '—'}</Text>
              {row.canon ? <Text className="text-muted-foreground">{` → ${row.canon}`}</Text> : null}
            </Text>
            <Text className="w-[58px] text-right font-mono text-[11.5px] text-foreground">{fmt(row.occ ?? 0)}</Text>
            <View className="flex-1 items-start">
              {row.tone ? (
                <SemanticBadge family="find" state={row.tone} size="sm">
                  {row.status ?? row.tone}
                </SemanticBadge>
              ) : (
                <Text className="font-body text-[11.5px] text-muted-foreground">{row.status ?? '—'}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
