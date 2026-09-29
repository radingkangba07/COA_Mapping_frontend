import React from 'react';
import { Text, View } from 'react-native';
import { Table } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';
import type { ImportRecordDto } from '../services/test_import.service';
import { shortBatch } from './test-import.utils';

export function RecordsTable({
  records,
  total,
}: {
  records: ImportRecordDto[];
  total: number;
}): React.JSX.Element {
  if (records.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="font-body text-sm text-muted-foreground">No records in this batch.</Text>
      </View>
    );
  }
  return (
    <>
      <Table maxHeight={560}>
        <Table.Header>
          <Table.HeaderCell width={72}>Row</Table.HeaderCell>
          <Table.HeaderCell width={140}>Internal ID</Table.HeaderCell>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell width={76}>Batch</Table.HeaderCell>
          <Table.HeaderCell width={96}>Outcome</Table.HeaderCell>
          <Table.HeaderCell width={220}>Target ID</Table.HeaderCell>
          <Table.HeaderCell width={56}>ms</Table.HeaderCell>
        </Table.Header>
        {records.map((r) => (
          <Table.Row key={r.id}>
            <Table.Cell width={72}>{String(r.source_row_index)}</Table.Cell>
            <Table.Cell width={140}>
              <Text className="font-mono text-xs text-foreground">{r.internal_id ?? '—'}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                {r.display_name ?? '—'}
              </Text>
            </Table.Cell>
            <Table.Cell width={76}>
              <Text className="font-body text-xs text-muted-foreground">{shortBatch(r.batch_code)}</Text>
            </Table.Cell>
            <Table.Cell width={96}>
              <Badge
                variant={
                  r.outcome === 'imported'
                    ? 'success'
                    : r.outcome === 'failed'
                      ? 'destructive'
                      : 'secondary'
                }
                className="self-start"
              >
                {r.outcome === 'imported' ? 'Imported' : r.outcome === 'failed' ? 'Failed' : 'Skipped'}
              </Badge>
            </Table.Cell>
            <Table.Cell width={220}>
              <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
                {r.target_id ?? '—'}
              </Text>
            </Table.Cell>
            <Table.Cell width={56}>
              <Text className="font-body text-xs text-muted-foreground">
                {r.latency_ms != null ? String(r.latency_ms) : '—'}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table>
      <View className="px-4 py-2 border-t border-border">
        <Text className="font-body text-xs text-muted-foreground">
          {`Showing ${String(records.length)} of ${String(total)} import_records — the full audit is in the run export.`}
        </Text>
      </View>
    </>
  );
}
