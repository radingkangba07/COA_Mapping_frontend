import React from 'react';
import { Text, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import { Sheet } from '@/shared/components/ui/Sheet';
import { Badge } from '@/shared/components/ui/Badge';
import { ScrollArea } from '@/shared/components/ui/ScrollArea';
import { ProvenanceLabel } from '@/shared/components/ui/ProvenanceLabel/ProvenanceLabel';
import type { ImportErrorDto, ImportRecordDto, ConnectorRequestDto } from '../services/test_import.service';
import { shortBatch, shortReqCode } from './test-import.utils';

const FIX_STEP_LABEL: Record<string, string> = {
  mapping: 'Fix in Column Mapping',
  values: 'Fix in Value Mapping',
};

export function ErrorDetailDrawer({
  error,
  records,
  connectorRequests,
  onClose,
  onGoToStep,
  onRetry,
}: {
  error: ImportErrorDto | null;
  records: ImportRecordDto[];
  connectorRequests: ConnectorRequestDto[];
  onClose: () => void;
  onGoToStep?: (stepId: string) => void;
  onRetry: () => void;
}): React.JSX.Element {
  const fixStep = error?.ai_fix_step ?? null;
  const fixLabel = fixStep != null && fixStep in FIX_STEP_LABEL ? FIX_STEP_LABEL[fixStep] : 'Review source data';

  const record = error != null
    ? (records.find((r) => r.source_row_index === error.source_row_index) ?? null)
    : null;
  const connReq = error?.connector_request_id != null
    ? (connectorRequests.find((c) => c.id === error.connector_request_id) ?? null)
    : null;

  return (
    <Sheet visible={error != null} onClose={onClose} side="right" width={480} testID="error-detail-sheet">
      {error != null ? (
        <>
          <Sheet.Header>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Import error
                </Text>
                <Text className="font-body text-xs text-muted-foreground">{`Row ${String(error.source_row_index)}`}</Text>
                {error.record_ref != null && error.record_ref !== String(error.source_row_index) ? (
                  <Text className="font-body text-xs text-muted-foreground">{error.record_ref}</Text>
                ) : null}
                <Text className="font-body text-xs text-muted-foreground">{shortBatch(error.batch_code)}</Text>
              </View>
              <Sheet.Title>{error.error_title}</Sheet.Title>
            </View>
            <Sheet.Close onPress={onClose} />
          </Sheet.Header>

          <ScrollArea className="flex-1">
            <Sheet.Content className="gap-5 pt-4">

              <View className="flex-row gap-6 flex-wrap">
                <View className="gap-1">
                  <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Retry Class
                  </Text>
                  <Badge
                    variant={error.retry_class === 'permanent' ? 'destructive' : 'warning'}
                    className="self-start"
                  >
                    {error.retry_class === 'permanent' ? 'Permanent' : 'Transient'}
                  </Badge>
                </View>
                <View className="gap-1">
                  <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Attempts
                  </Text>
                  <Text className="font-body text-sm text-foreground">
                    {connReq != null ? `${String(connReq.retries + 1)}` : '—'}
                  </Text>
                </View>
                {connReq != null ? (
                  <View className="gap-1">
                    <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Connector Request
                    </Text>
                    <Text className="font-body text-xs font-mono text-foreground">
                      {shortReqCode(connReq.request_code)}
                    </Text>
                  </View>
                ) : error.connector_request_id != null ? (
                  <View className="gap-1">
                    <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Connector Request
                    </Text>
                    <Text className="font-body text-xs font-mono text-foreground">
                      {error.connector_request_id.slice(0, 12)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="rounded-lg bg-muted/50 p-3 gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <ProvenanceLabel state="fact">FACT</ProvenanceLabel>
                    <Text className="font-body text-sm font-semibold text-foreground">What was rejected</Text>
                  </View>
                  <Text className="font-body text-xs text-muted-foreground">
                    {`Row ${String(error.source_row_index)} of the source extract`}
                  </Text>
                </View>
                <View className="gap-1.5">
                  {record?.display_name != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Item</Text>
                      <Text className="font-body text-xs font-semibold text-foreground flex-1" numberOfLines={1}>
                        {record.display_name}
                      </Text>
                    </View>
                  ) : null}
                  {record?.internal_id != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Item Number</Text>
                      <Text className="font-mono text-xs text-foreground flex-1">{record.internal_id}</Text>
                    </View>
                  ) : null}
                  {error.source_field != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Source column</Text>
                      <Text className="font-body text-xs font-semibold text-foreground flex-1">
                        {error.source_field}
                      </Text>
                    </View>
                  ) : null}
                  {error.raw_value != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Raw value</Text>
                      <View className="rounded px-1.5 py-0.5 bg-destructive/10 self-start">
                        <Text className="font-mono text-xs text-destructive">{error.raw_value}</Text>
                      </View>
                    </View>
                  ) : null}
                  {error.written_to != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Written to</Text>
                      <Text className="font-body text-xs text-foreground flex-1">{error.written_to}</Text>
                    </View>
                  ) : null}
                  {error.value_sent != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Value sent</Text>
                      <Text className="font-body text-xs text-foreground flex-1">{error.value_sent}</Text>
                    </View>
                  ) : null}
                </View>
                {error.error_detail != null ? (
                  <Text className="font-body text-xs text-muted-foreground">{error.error_detail}</Text>
                ) : null}
              </View>

              {error.erp_response != null ? (
                <View className="gap-2">
                  <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    ERP Response
                  </Text>
                  <View className="rounded-lg bg-muted p-3">
                    <Text className="font-mono text-xs text-foreground">{error.erp_response}</Text>
                  </View>
                </View>
              ) : null}

              {error.parsed_by === 'deterministic' && error.deterministic_rule != null ? (
                <View className="rounded-lg bg-muted/50 p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <ProvenanceLabel state="fact">FACT</ProvenanceLabel>
                      <Text className="font-body text-sm font-semibold text-foreground">Deterministic parse</Text>
                    </View>
                    <Text className="font-body text-xs" style={{ color: colors.success }}>
                      Rule matched
                    </Text>
                  </View>
                  <Text className="font-body text-xs text-foreground">{error.deterministic_rule}</Text>
                </View>
              ) : null}

              {error.parsed_by === 'ai' && error.ai_analysis != null ? (
                <View className="rounded-lg bg-muted/50 p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <ProvenanceLabel state="ai">AI</ProvenanceLabel>
                      <Text className="font-body text-sm font-semibold text-foreground">Mig's analysis</Text>
                    </View>
                    {error.ai_model != null ? (
                      <Text className="font-body text-xs text-muted-foreground">{error.ai_model}</Text>
                    ) : null}
                  </View>
                  <Text className="font-body text-xs text-foreground">{error.ai_analysis}</Text>
                  {error.ai_likely_cause != null ? (
                    <View className="mt-1 rounded-lg bg-muted/80 p-2.5 gap-1">
                      <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {error.ai_cause_category != null
                          ? `Likely cause · ${error.ai_cause_category}`
                          : 'Likely cause'}
                      </Text>
                      <Text className="font-body text-xs text-foreground">{error.ai_likely_cause}</Text>
                      {error.ai_fix_suggestion != null ? (
                        <Text className="font-body text-xs text-muted-foreground mt-0.5">
                          {error.ai_fix_suggestion}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {error.ai_fix_step != null ? (
                    <Text className="font-body text-[11px] text-muted-foreground mt-1">
                      Suggestions reopen the earlier step for review — nothing is changed automatically.
                    </Text>
                  ) : null}
                </View>
              ) : null}

            </Sheet.Content>
          </ScrollArea>

          <Sheet.Footer>
            <Button
              onPress={() => {
                if (fixStep != null && onGoToStep != null && fixStep in FIX_STEP_LABEL) {
                  onGoToStep(fixStep);
                } else {
                  onClose();
                }
              }}
              testID="error-drawer-fix"
            >
              <Text className="text-sm font-semibold text-primary-foreground">{fixLabel}</Text>
            </Button>
            <Button variant="outline" onPress={onRetry} testID="error-drawer-retry">
              <View className="flex-row items-center gap-1.5">
                <RotateCcw size={14} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Retry record</Text>
              </View>
            </Button>
          </Sheet.Footer>
        </>
      ) : null}
    </Sheet>
  );
}
