import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Play, RotateCcw } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import { StepRail } from '@/shared/components/ui/StepRail';
import { Sheet } from '@/shared/components/ui/Sheet';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Table } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { ScrollArea } from '@/shared/components/ui/ScrollArea';
import { ProvenanceLabel } from '@/shared/components/ui/ProvenanceLabel/ProvenanceLabel';
import { toStepRail } from '../mappers/toStepRail';
import { getStep, STEPS } from '../utils/taxonomy';
import { useWizardStore } from '../store/wizard.store';
import { useTestImport } from '../hooks/useTestImport';
import type { EntityId } from '../dp-kit/types/entity';
import type { StepId } from '../types/wizard.types';
import type { ImportRunDto, ImportBatchItem, ImportErrorDto, ImportRecordDto, ConnectorRequestDto } from '../services/test_import.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${String(mins)}m ${String(secs)}s`;
}

// ─── StatStrip ───────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}): React.JSX.Element {
  return (
    <View className="flex-1 flex-row items-center justify-between rounded-[7px] border border-border px-4 py-3 gap-3">
      <Text className="font-body text-sm text-muted-foreground">{label}</Text>
      <Text className="font-heading text-sm font-semibold" style={{ color: color ?? colors.foreground }}>
        {value}
      </Text>
    </View>
  );
}

function StatStrip({ run }: { run: ImportRunDto }): React.JSX.Element {
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

// ─── ImportRunBar ─────────────────────────────────────────────────────────────

function ImportRunBar({ run }: { run: ImportRunDto }): React.JSX.Element {
  const isComplete = run.status === 'complete';
  const isRunning = run.status === 'pending' || run.status === 'running';

  return (
    <View className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 gap-3">
      <View className="flex-row items-center gap-2 flex-1 flex-wrap">
        <Text className="font-body text-xs text-muted-foreground">Import run</Text>
        {run.run_code != null ? (
          <View className="rounded-[5px] border border-border bg-muted px-2 py-0.5">
            <Text className="font-mono text-xs text-foreground">{run.run_code}</Text>
          </View>
        ) : null}
        <Text className="font-body text-xs text-muted-foreground">
          {`· batch ${String(run.batch_size)} · ${String(run.req_per_sec)} req/s`}
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5 shrink-0">
        <View className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: isComplete ? colors.success : isRunning ? colors.accent : colors.destructive }} />
        <Text className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recorded Run
        </Text>
        <Text className="font-body text-xs" style={{ color: isComplete ? colors.success : colors.muted }}>
          {isComplete
            ? run.duration_ms != null
              ? `Completed · ${formatDuration(run.duration_ms)}`
              : 'Completed'
            : isRunning
              ? 'Running…'
              : 'Failed'}
        </Text>
      </View>
    </View>
  );
}

// ─── BatchSidebarItem ─────────────────────────────────────────────────────────

function BatchSidebarItem({
  batch,
  isSelected,
  onPress,
}: {
  batch: ImportBatchItem;
  isSelected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const hasErrors = batch.errors_open > 0;
  return (
    <Pressable
      onPress={onPress}
      className="px-3 py-2.5 border-b border-border"
      style={isSelected ? { backgroundColor: colors.accent + '12', borderLeftWidth: 2, borderLeftColor: colors.accent } : undefined}
      testID={`batch-item-${batch.batch_code}`}
    >
      <View className="flex-row items-center justify-between">
        <Text
          className="font-body text-sm"
          style={{ fontWeight: isSelected ? '600' : '400', color: isSelected ? colors.accent : colors.foreground }}
          numberOfLines={1}
        >
          {batch.batch_code}
        </Text>
        {hasErrors ? (
          <View className="h-5 w-5 items-center justify-center rounded-full bg-destructive">
            <Text className="font-body text-[10px] font-bold text-destructive-foreground">
              {String(batch.errors_open)}
            </Text>
          </View>
        ) : (
          <Check size={14} color={colors.success} />
        )}
      </View>
      <Text className="font-body text-xs text-muted-foreground mt-0.5">
        {`${String(batch.records_total)} records`}
      </Text>
    </Pressable>
  );
}

// ─── ErrorDetailDrawer ────────────────────────────────────────────────────────

function ErrorDetailDrawer({
  error,
  onClose,
}: {
  error: ImportErrorDto | null;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Sheet visible={error != null} onClose={onClose} side="right" width={480} testID="error-detail-sheet">
      {error != null ? (
        <>
          <Sheet.Header>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-2 flex-wrap">
                <Text className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Import error</Text>
                <Text className="font-body text-xs text-muted-foreground">{`Row ${String(error.source_row_index)}`}</Text>
                {error.record_ref != null ? (
                  <Text className="font-body text-xs text-muted-foreground">{error.record_ref}</Text>
                ) : null}
                <Text className="font-body text-xs text-muted-foreground">{error.batch_code}</Text>
              </View>
              <Sheet.Title>{error.error_title}</Sheet.Title>
            </View>
            <Sheet.Close onPress={onClose} />
          </Sheet.Header>

          <ScrollArea className="flex-1">
            <Sheet.Content className="gap-5 pt-4">

              {/* Meta row */}
              <View className="flex-row gap-6">
                <View className="gap-1">
                  <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Retry Class</Text>
                  <Badge
                    variant={error.retry_class === 'permanent' ? 'destructive' : 'warning'}
                    className="self-start"
                  >
                    {error.retry_class === 'permanent' ? 'Permanent' : 'Transient'}
                  </Badge>
                </View>
                <View className="gap-1">
                  <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Attempts</Text>
                  <Text className="font-body text-sm text-foreground">1 of 1</Text>
                </View>
                {error.connector_request_id != null ? (
                  <View className="gap-1">
                    <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Connector Request</Text>
                    <Text className="font-body text-xs font-mono text-foreground">{error.connector_request_id.slice(0, 12)}</Text>
                  </View>
                ) : null}
              </View>

              {/* What was rejected */}
              <View className="rounded-lg bg-muted/50 p-3 gap-3">
                <View className="flex-row items-center justify-between">
                  <ProvenanceLabel state="fact">What was rejected</ProvenanceLabel>
                  <Text className="font-body text-xs text-muted-foreground">{`Row ${String(error.source_row_index)} of the source extract`}</Text>
                </View>
                <View className="gap-1.5">
                  {error.source_field != null ? (
                    <View className="flex-row gap-4">
                      <Text className="font-body text-xs text-muted-foreground w-28">Source column</Text>
                      <Text className="font-body text-xs font-semibold text-foreground flex-1">{error.source_field}</Text>
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
              </View>

              {/* ERP response */}
              {error.erp_response != null ? (
                <View className="gap-2">
                  <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">ERP Response</Text>
                  <View className="rounded-lg bg-muted p-3">
                    <Text className="font-mono text-xs text-foreground">{error.erp_response}</Text>
                  </View>
                </View>
              ) : null}

              {/* Deterministic parse */}
              {error.parsed_by === 'deterministic' && error.deterministic_rule != null ? (
                <View className="rounded-lg bg-muted/50 p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <ProvenanceLabel state="fact">Deterministic parse</ProvenanceLabel>
                    <Text className="font-body text-xs" style={{ color: colors.success }}>Rule matched</Text>
                  </View>
                  <Text className="font-body text-xs text-foreground">{error.deterministic_rule}</Text>
                </View>
              ) : null}

              {/* AI analysis */}
              {error.parsed_by === 'ai' && error.ai_analysis != null ? (
                <View className="rounded-lg bg-muted/50 p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <ProvenanceLabel state="ai">Mig's analysis</ProvenanceLabel>
                    {error.ai_model != null ? (
                      <Text className="font-body text-xs text-muted-foreground">{error.ai_model}</Text>
                    ) : null}
                  </View>
                  <Text className="font-body text-xs text-foreground">{error.ai_analysis}</Text>
                  {error.ai_likely_cause != null ? (
                    <View className="mt-1 gap-1">
                      <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {error.ai_cause_category != null ? `Likely cause · ${error.ai_cause_category}` : 'Likely cause'}
                      </Text>
                      <Text className="font-body text-xs text-foreground">{error.ai_likely_cause}</Text>
                    </View>
                  ) : null}
                  {error.ai_fix_suggestion != null ? (
                    <View className="mt-1 gap-1">
                      <Text className="font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fix suggestion</Text>
                      <Text className="font-body text-xs text-foreground">{error.ai_fix_suggestion}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

            </Sheet.Content>
          </ScrollArea>

          <Sheet.Footer>
            <Button variant="outline" onPress={onClose} testID="error-drawer-retry">
              <Text className="text-sm font-medium text-foreground">Retry record</Text>
            </Button>
            <Button onPress={onClose} testID="error-drawer-fix">
              <Text className="text-sm font-semibold text-primary-foreground">Fix in Step 4 · Values</Text>
            </Button>
          </Sheet.Footer>
        </>
      ) : null}
    </Sheet>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

interface TestImportScreenProps {
  readonly entityId?: EntityId;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

export function TestImportScreen({
  entityId: entityIdProp,
  onBack: onBackProp,
  onContinue,
}: TestImportScreenProps): React.JSX.Element {
  const storeEntityId = useWizardStore((s) => s.entityId);
  const entityId = (entityIdProp ?? storeEntityId) as EntityId;

  const {
    importRun,
    batches,
    errors,
    records,
    connectorRequests,
    selectedBatch,
    setSelectedBatch,
    isLoading,
    isTriggering,
    error,
    triggerRun,
  } = useTestImport(entityId);

  const [selectedError, setSelectedError] = useState<ImportErrorDto | null>(null);

  const handleBack = useCallback((): void => { onBackProp?.(); }, [onBackProp]);

  const step = getStep('test');
  const stepRail = toStepRail('test' as StepId);

  const isRunning = importRun?.status === 'pending' || importRun?.status === 'running';
  const isComplete = importRun?.status === 'complete';
  const hasFailed = importRun?.status === 'failed';
  const hasUnresolvedErrors = isComplete && (importRun?.rows_failed ?? 0) > 0;

  return (
    <View className="flex-1 flex-col bg-background" testID="test-import-screen">

      {/* ── Top section ── */}
      <View className="px-5 pt-5 pb-0 gap-3">
        <StepRail rail={stepRail} />

        {/* Title + action buttons */}
        <View className="flex-row items-start justify-between gap-3 flex-wrap">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-2">
              <Text className="font-heading text-[18px] font-bold text-foreground">{step.label}</Text>
              <Text className="font-body text-xs text-muted-foreground">{`Step ${String(step.n)} of ${String(STEPS.length)}`}</Text>
            </View>
            {importRun != null ? (
              <Text className="font-body text-xs text-muted-foreground">
                {`Simulated batch of ${String(importRun.batch_size)} records per batch — target IDs captured for rollback`}
              </Text>
            ) : (
              <Text className="font-body text-sm text-muted-foreground">
                Validate your field mappings against the ERP before committing to a live import.
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {onBackProp != null ? (
              <Button variant="outline" onPress={handleBack} testID="test-import-back">
                <View className="flex-row items-center gap-1.5">
                  <ArrowLeft size={14} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">Back</Text>
                </View>
              </Button>
            ) : null}
            <Button
              onPress={onContinue}
              disabled={onContinue == null || !isComplete}
              testID="test-import-proceed"
            >
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-semibold text-primary-foreground">Proceed to Import</Text>
                <ArrowRight size={14} color={colors.primaryForeground} />
              </View>
            </Button>
          </View>
        </View>

        {/* Status banner */}
        {hasUnresolvedErrors ? (
          <View className="flex-row items-center gap-2">
            <AlertCircle size={16} color={colors.destructive} />
            <Text className="font-body text-sm font-semibold text-destructive">
              {'Test batch has unresolved failures  '}
            </Text>
            <Text className="font-body text-xs text-muted-foreground">
              {`${String(importRun?.rows_imported ?? 0)} of ${String(importRun?.rows_attempted ?? 0)} imported · ${String(importRun?.rows_failed ?? 0)} failed (${String(importRun?.rows_failed ?? 0)} open) · ${String(importRun?.rows_skipped ?? 0)} skipped · ${String(importRun?.rows_reconciled ?? 0)} reconciled`}
            </Text>
          </View>
        ) : null}

        {/* Stat strip */}
        {importRun != null ? <StatStrip run={importRun} /> : null}

        {/* Import run metadata bar */}
        {importRun != null ? <ImportRunBar run={importRun} /> : null}
      </View>

      {/* ── Content area ── */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error != null && importRun == null ? (
        <View className="flex-1 px-5 py-6">
          <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 gap-3">
            <Text className="font-body text-sm text-destructive">{error.message}</Text>
            <Button variant="outline" onPress={triggerRun} testID="test-import-retry">
              <View className="flex-row items-center gap-1.5">
                <RotateCcw size={14} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Retry</Text>
              </View>
            </Button>
          </View>
        </View>
      ) : isRunning ? (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="font-body text-sm text-muted-foreground">Running simulated import…</Text>
        </View>
      ) : hasFailed ? (
        <View className="flex-1 px-5 py-6">
          <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 gap-3">
            <Text className="font-heading text-sm font-semibold text-destructive">Import run failed</Text>
            {importRun?.error_detail != null ? (
              <Text className="font-body text-sm text-muted-foreground">{importRun.error_detail}</Text>
            ) : null}
            <Button variant="outline" onPress={triggerRun} disabled={isTriggering} testID="test-import-retry">
              <View className="flex-row items-center gap-1.5">
                <RotateCcw size={14} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Retry</Text>
              </View>
            </Button>
          </View>
        </View>
      ) : importRun == null ? (
        <View className="flex-1 items-center justify-center px-5">
          <View className="rounded-lg border border-border bg-muted/30 p-8 items-center gap-4 max-w-md w-full">
            <Text className="font-body text-sm text-muted-foreground text-center">
              Run a simulated import to validate your field mappings against the ERP connector. No production data is written — all requests are captured for audit.
            </Text>
            <Button onPress={triggerRun} disabled={isTriggering} testID="test-import-run">
              <View className="flex-row items-center gap-1.5">
                {isTriggering ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Play size={14} color={colors.primaryForeground} />
                )}
                <Text className="text-sm font-semibold text-primary-foreground">
                  {isTriggering ? 'Starting…' : 'Start Simulated Import'}
                </Text>
              </View>
            </Button>
          </View>
        </View>
      ) : (
        /* ── Two-panel layout (complete state) ── */
        <View className="flex-1 flex-row border-t border-border mt-3">

          {/* Batch sidebar */}
          <View className="w-72 border-r border-border">
            <Text className="px-3 pt-3 pb-1.5 font-body text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Batches
            </Text>

            {/* All batches row */}
            <Pressable
              onPress={() => setSelectedBatch(null)}
              className="px-3 py-2.5 border-b border-border"
              style={selectedBatch == null ? { backgroundColor: colors.accent + '12', borderLeftWidth: 2, borderLeftColor: colors.accent } : undefined}
              testID="batch-item-all"
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-body text-sm"
                  style={{ fontWeight: selectedBatch == null ? '600' : '400', color: selectedBatch == null ? colors.accent : colors.foreground }}
                >
                  All batches
                </Text>
                <Text className="font-body text-xs text-muted-foreground">
                  {String(importRun.rows_attempted ?? 0)}
                </Text>
              </View>
            </Pressable>

            <ScrollArea className="flex-1">
              {batches.map((batch) => (
                <BatchSidebarItem
                  key={batch.batch_code}
                  batch={batch}
                  isSelected={selectedBatch === batch.batch_code}
                  onPress={() => setSelectedBatch(batch.batch_code)}
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
                  {`Import errors  ${String(errors.total)}`}
                </Tabs.Trigger>
                <Tabs.Trigger value="records" testID="tab-records">
                  {`Records  ${String(records.total)}`}
                </Tabs.Trigger>
                <Tabs.Trigger value="connectors" testID="tab-connectors">
                  {`Connector requests  ${String(connectorRequests.total)}`}
                </Tabs.Trigger>
              </Tabs.List>

              {/* Errors tab */}
              <Tabs.Content value="errors" className="flex-1 mt-0">
                {errors.items.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-12">
                    <Text className="font-body text-sm text-muted-foreground">No errors in this batch.</Text>
                  </View>
                ) : (
                  <Table maxHeight={600}>
                    <Table.Header>
                      <Table.HeaderCell width={120}>Source Row</Table.HeaderCell>
                      <Table.HeaderCell width={72}>Batch</Table.HeaderCell>
                      <Table.HeaderCell>Error</Table.HeaderCell>
                      <Table.HeaderCell width={110}>Retry Class</Table.HeaderCell>
                      <Table.HeaderCell width={120}>Parsed By</Table.HeaderCell>
                      <Table.HeaderCell width={80}>Status</Table.HeaderCell>
                      <Table.HeaderCell width={32} />
                    </Table.Header>
                    {errors.items.map((e) => (
                      <Table.Row key={e.id} onPress={() => setSelectedError(e)}>
                        <Table.Cell width={120}>
                          <Text className="font-body text-sm font-semibold text-foreground">{`Row ${String(e.source_row_index)}`}</Text>
                          {e.record_ref != null ? (
                            <Text className="font-body text-xs text-muted-foreground">{e.record_ref}</Text>
                          ) : null}
                        </Table.Cell>
                        <Table.Cell width={72}>
                          <Text className="font-body text-xs text-muted-foreground">{e.batch_code}</Text>
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
                        <Table.Cell width={110}>
                          <Badge
                            variant={e.retry_class === 'permanent' ? 'destructive' : 'warning'}
                            className="self-start"
                          >
                            {e.retry_class === 'permanent' ? 'Permanent' : 'Transient'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell width={120}>
                          <ProvenanceLabel state={e.parsed_by === 'deterministic' ? 'fact' : 'ai'}>
                            {e.parsed_by === 'deterministic' ? 'Deterministic' : 'AI'}
                          </ProvenanceLabel>
                        </Table.Cell>
                        <Table.Cell width={80}>
                          <Text className="font-body text-sm text-foreground capitalize">{e.status}</Text>
                        </Table.Cell>
                        <Table.Cell width={32}>
                          <Text className="font-body text-sm text-muted-foreground">›</Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table>
                )}
              </Tabs.Content>

              {/* Records tab */}
              <Tabs.Content value="records" className="flex-1 mt-0">
                {records.items.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-12">
                    <Text className="font-body text-sm text-muted-foreground">No records in this batch.</Text>
                  </View>
                ) : (
                  <>
                    <Table maxHeight={560}>
                      <Table.Header>
                        <Table.HeaderCell width={56}>Row</Table.HeaderCell>
                        <Table.HeaderCell width={100}>Internal ID</Table.HeaderCell>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell width={72}>Batch</Table.HeaderCell>
                        <Table.HeaderCell width={100}>Outcome</Table.HeaderCell>
                        <Table.HeaderCell width={200}>Target ID</Table.HeaderCell>
                        <Table.HeaderCell width={64}>ms</Table.HeaderCell>
                      </Table.Header>
                      {records.items.map((r) => (
                        <Table.Row key={r.id}>
                          <Table.Cell width={56}>{String(r.source_row_index)}</Table.Cell>
                          <Table.Cell width={100}>
                            <Text className="font-mono text-xs text-foreground">{r.internal_id ?? '—'}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                              {r.display_name ?? '—'}
                            </Text>
                          </Table.Cell>
                          <Table.Cell width={72}>
                            <Text className="font-body text-xs text-muted-foreground">{r.batch_code}</Text>
                          </Table.Cell>
                          <Table.Cell width={100}>
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
                          <Table.Cell width={200}>
                            <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
                              {r.target_id ?? '—'}
                            </Text>
                          </Table.Cell>
                          <Table.Cell width={64}>
                            <Text className="font-body text-xs text-muted-foreground">
                              {r.latency_ms != null ? String(r.latency_ms) : '—'}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table>
                    <View className="px-4 py-2 border-t border-border">
                      <Text className="font-body text-xs text-muted-foreground">
                        {`Showing ${String(records.items.length)} of ${String(records.total)} import_records — the full audit is in the run export.`}
                      </Text>
                    </View>
                  </>
                )}
              </Tabs.Content>

              {/* Connector requests tab */}
              <Tabs.Content value="connectors" className="flex-1 mt-0">
                {connectorRequests.items.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-12">
                    <Text className="font-body text-sm text-muted-foreground">No connector requests in this batch.</Text>
                  </View>
                ) : (
                  <>
                    <Table maxHeight={560}>
                      <Table.Header>
                        <Table.HeaderCell width={100}>Request</Table.HeaderCell>
                        <Table.HeaderCell width={90}>Operation</Table.HeaderCell>
                        <Table.HeaderCell>Model / Record</Table.HeaderCell>
                        <Table.HeaderCell width={72}>Batch</Table.HeaderCell>
                        <Table.HeaderCell width={72}>Result</Table.HeaderCell>
                        <Table.HeaderCell width={90}>Latency</Table.HeaderCell>
                        <Table.HeaderCell width={72}>Retries</Table.HeaderCell>
                      </Table.Header>
                      {connectorRequests.items.map((c) => {
                        const is2xx = c.http_status != null && c.http_status >= 200 && c.http_status < 300;
                        return (
                          <Table.Row key={c.id}>
                            <Table.Cell width={100}>
                              <Text className="font-mono text-xs text-foreground">{c.request_code}</Text>
                            </Table.Cell>
                            <Table.Cell width={90}>
                              <Text className="font-body text-xs text-muted-foreground">{c.operation}</Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Text className="font-body text-sm text-foreground" numberOfLines={1}>
                                {c.erp_model != null && c.record_ref != null
                                  ? `${c.erp_model} · ${c.record_ref}`
                                  : (c.erp_model ?? c.record_ref ?? '—')}
                              </Text>
                            </Table.Cell>
                            <Table.Cell width={72}>
                              <Text className="font-body text-xs text-muted-foreground">{c.batch_code}</Text>
                            </Table.Cell>
                            <Table.Cell width={72}>
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
                            <Table.Cell width={72}>
                              <Text className="font-body text-xs text-muted-foreground">{String(c.retries)}</Text>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table>
                    <View className="px-4 py-2 border-t border-border">
                      <Text className="font-body text-xs text-muted-foreground">
                        {`Showing ${String(connectorRequests.items.length)} of ${String(connectorRequests.total)} connector_requests — request and response payloads stored for audit.`}
                      </Text>
                    </View>
                  </>
                )}
              </Tabs.Content>
            </Tabs>
          </View>
        </View>
      )}

      {/* Error detail drawer */}
      <ErrorDetailDrawer error={selectedError} onClose={() => setSelectedError(null)} />
    </View>
  );
}
