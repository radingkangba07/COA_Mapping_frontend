import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { Tabs } from '@/shared/components/ui/Tabs';
import { ScrollArea } from '@/shared/components/ui/ScrollArea';
import type {
  ImportRunDto,
  ImportBatchItem,
  ImportErrorDto,
  ImportRecordDto,
  ConnectorRequestDto,
} from '../services/test_import.service';
import { ImportRunBar } from './ImportRunBar';
import { BatchSidebarItem } from './BatchSidebarItem';
import { ErrorsTable } from './ErrorsTable';
import { RecordsTable } from './RecordsTable';
import { ConnectorRequestsTable } from './ConnectorRequestsTable';
import { shortBatch } from './test-import.utils';

export function ImportResultPanel({
  importRun,
  batches,
  errors,
  records,
  connectorRequests,
  selectedBatch,
  onSelectBatch,
  onSelectError,
}: {
  importRun: ImportRunDto;
  batches: ImportBatchItem[];
  errors: { items: ImportErrorDto[]; total: number };
  records: { items: ImportRecordDto[]; total: number };
  connectorRequests: { items: ConnectorRequestDto[]; total: number };
  selectedBatch: string | null;
  onSelectBatch: (batch: string | null) => void;
  onSelectError: (error: ImportErrorDto) => void;
}): React.JSX.Element {
  return (
    <View className="flex-1 mx-5 mt-2 mb-4 rounded-lg border border-border overflow-hidden">
      <ImportRunBar run={importRun} />
      <View className="flex-1 flex-row border-t border-border">

        {/* Batch sidebar */}
        <View className="w-72 border-r border-border">
          <Text className="px-3 pt-3 pb-1.5 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Batches
          </Text>
          <Pressable
            onPress={() => onSelectBatch(null)}
            className="px-3 py-2.5"
            style={
              selectedBatch == null
                ? { borderWidth: 1.5, borderColor: colors.accent, borderRadius: 6, backgroundColor: colors.accent + '12', marginHorizontal: 6, marginVertical: 3 }
                : { borderBottomWidth: 1, borderBottomColor: colors.border }
            }
            testID="batch-item-all"
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="font-body text-sm"
                style={{
                  fontWeight: selectedBatch == null ? '600' : '400',
                  color: selectedBatch == null ? colors.accent : colors.foreground,
                }}
              >
                All batches
              </Text>
              <View className="rounded-[5px] border border-border bg-muted px-2 py-0.5">
                <Text className="font-mono text-[11px] text-foreground">
                  {String(importRun.rows_attempted ?? 0)}
                </Text>
              </View>
            </View>
          </Pressable>
          <ScrollArea className="flex-1">
            {batches.map((batch) => (
              <BatchSidebarItem
                key={batch.batch_code}
                batch={batch}
                isSelected={selectedBatch === batch.batch_code}
                onPress={() => onSelectBatch(batch.batch_code)}
              />
            ))}
          </ScrollArea>
          <View className="border-t border-border px-3 py-3">
            <Text className="font-body text-[11px] text-muted-foreground">
              Every request and response is stored in connector_requests. Errors are parsed deterministically first; only unfamiliar ERP errors go to AI analysis.
            </Text>
          </View>
        </View>

        {/* Tab content */}
        <View className="flex-1 flex-col">
          <Tabs defaultValue="errors" variant="underline" className="flex-1">
            <Tabs.List className="px-4 border-b border-border">
              <Tabs.Trigger value="errors" testID="tab-errors">
                {`Import errors ${String(errors.total)}`}
              </Tabs.Trigger>
              <Tabs.Trigger value="records" testID="tab-records">
                {`Records ${String(records.total)}`}
              </Tabs.Trigger>
              <Tabs.Trigger value="connectors" testID="tab-connectors">
                {`Connector requests ${String(connectorRequests.total)}`}
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="errors" className="flex-1 mt-0">
              <ErrorsTable errors={errors.items} onSelectError={onSelectError} />
            </Tabs.Content>
            <Tabs.Content value="records" className="flex-1 mt-0">
              <RecordsTable records={records.items} total={records.total} />
            </Tabs.Content>
            <Tabs.Content value="connectors" className="flex-1 mt-0">
              <ConnectorRequestsTable requests={connectorRequests.items} total={connectorRequests.total} />
            </Tabs.Content>
          </Tabs>
        </View>

      </View>
    </View>
  );
}
