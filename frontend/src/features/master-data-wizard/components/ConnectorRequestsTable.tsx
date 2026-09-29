import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { Table } from '@/shared/components/ui/Table';
import type { ConnectorRequestDto } from '../services/test_import.service';
import { shortBatch, shortReqCode } from './test-import.utils';

export function ConnectorRequestsTable({
  requests,
  total,
}: {
  requests: ConnectorRequestDto[];
  total: number;
}): React.JSX.Element {
  if (requests.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="font-body text-sm text-muted-foreground">No connector requests in this batch.</Text>
      </View>
    );
  }
  return (
    <>
      <Table maxHeight={560}>
        <Table.Header>
          <Table.HeaderCell width={136}>Request</Table.HeaderCell>
          <Table.HeaderCell width={110}>Operation</Table.HeaderCell>
          <Table.HeaderCell>Model / Record</Table.HeaderCell>
          <Table.HeaderCell width={76}>Batch</Table.HeaderCell>
          <Table.HeaderCell width={84}>Result</Table.HeaderCell>
          <Table.HeaderCell width={90}>Latency</Table.HeaderCell>
          <Table.HeaderCell width={92}>Retries</Table.HeaderCell>
        </Table.Header>
        {requests.map((c) => {
          const is2xx = c.http_status != null && c.http_status >= 200 && c.http_status < 300;
          return (
            <Table.Row key={c.id}>
              <Table.Cell width={136}>
                <Text className="font-mono text-xs text-foreground" numberOfLines={1}>{shortReqCode(c.request_code)}</Text>
              </Table.Cell>
              <Table.Cell width={110}>
                <Text className="font-body text-xs text-muted-foreground" numberOfLines={1}>{c.operation}</Text>
              </Table.Cell>
              <Table.Cell>
                <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                  {c.erp_model != null && c.record_ref != null
                    ? `${c.erp_model} · ${c.record_ref}`
                    : (c.erp_model ?? c.record_ref ?? '—')}
                </Text>
              </Table.Cell>
              <Table.Cell width={76}>
                <Text className="font-body text-xs text-muted-foreground">{shortBatch(c.batch_code)}</Text>
              </Table.Cell>
              <Table.Cell width={84}>
                {c.http_status != null ? (
                  <Text
                    className="font-heading text-sm font-semibold"
                    style={{ color: is2xx ? colors.success : colors.destructive }}
                  >
                    {String(c.http_status)}
                  </Text>
                ) : (
                  <Text className="font-body text-xs text-muted-foreground">—</Text>
                )}
              </Table.Cell>
              <Table.Cell width={90}>
                <Text className="font-body text-xs text-muted-foreground">
                  {c.latency_ms != null ? `${String(c.latency_ms)} ms` : '—'}
                </Text>
              </Table.Cell>
              <Table.Cell width={92}>
                <Text className="font-body text-xs text-muted-foreground">{String(c.retries)}</Text>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table>
      <View className="px-4 py-2 border-t border-border">
        <Text className="font-body text-xs text-muted-foreground">
          {`Showing ${String(requests.length)} of ${String(total)} connector_requests — request and response payloads stored for audit.`}
        </Text>
      </View>
    </>
  );
}
