import React from 'react';
import { Text, View } from 'react-native';
import { Table } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { ProvenanceLabel } from '@/shared/components/ui/ProvenanceLabel/ProvenanceLabel';
import type { ImportErrorDto } from '../services/test_import.service';
import { shortBatch } from './test-import.utils';

export function ErrorsTable({
  errors,
  onSelectError,
}: {
  errors: ImportErrorDto[];
  onSelectError: (error: ImportErrorDto) => void;
}): React.JSX.Element {
  if (errors.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="font-body text-sm text-muted-foreground">No errors in this batch.</Text>
      </View>
    );
  }
  return (
    <Table maxHeight={600}>
      <Table.Header>
        <Table.HeaderCell width={124}>Source Row</Table.HeaderCell>
        <Table.HeaderCell width={76}>Batch</Table.HeaderCell>
        <Table.HeaderCell>Error</Table.HeaderCell>
        <Table.HeaderCell width={128}>Retry Class</Table.HeaderCell>
        <Table.HeaderCell width={136}>Parsed By</Table.HeaderCell>
        <Table.HeaderCell width={80}>Status</Table.HeaderCell>
        <Table.HeaderCell width={24} />
      </Table.Header>
      {errors.map((e) => (
        <Table.Row key={e.id} onPress={() => onSelectError(e)}>
          <Table.Cell width={124}>
            <Text className="font-body text-sm font-semibold text-foreground">
              {`Row ${String(e.source_row_index)}`}
            </Text>
            {e.record_ref != null && e.record_ref !== String(e.source_row_index) ? (
              <Text className="font-body text-xs text-muted-foreground" numberOfLines={1}>{e.record_ref}</Text>
            ) : null}
          </Table.Cell>
          <Table.Cell width={76}>
            <Text className="font-body text-[11px] text-muted-foreground" numberOfLines={1}>{shortBatch(e.batch_code)}</Text>
          </Table.Cell>
          <Table.Cell>
            <Text className="font-body text-sm font-semibold text-foreground" numberOfLines={1}>
              {e.error_title}
            </Text>
            {e.error_detail != null ? (
              <Text className="font-mono text-[11px] text-muted-foreground" numberOfLines={2}>
                {e.error_detail}
              </Text>
            ) : null}
          </Table.Cell>
          <Table.Cell width={128}>
            <Badge
              variant={e.retry_class === 'permanent' ? 'destructive' : 'warning'}
              className="self-start"
            >
              {e.retry_class === 'permanent' ? 'Permanent' : 'Transient'}
            </Badge>
          </Table.Cell>
          <Table.Cell width={136}>
            <ProvenanceLabel state={e.parsed_by === 'deterministic' ? 'fact' : 'ai'}>
              {e.parsed_by === 'deterministic' ? 'Deterministic' : 'AI'}
            </ProvenanceLabel>
          </Table.Cell>
          <Table.Cell width={80}>
            <Text className="font-body text-sm text-foreground capitalize">{e.status}</Text>
          </Table.Cell>
          <Table.Cell width={24}>
            <Text className="font-body text-sm text-muted-foreground">›</Text>
          </Table.Cell>
        </Table.Row>
      ))}
    </Table>
  );
}
