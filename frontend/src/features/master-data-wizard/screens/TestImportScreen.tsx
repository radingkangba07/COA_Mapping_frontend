import React, { useCallback } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import { StepRail } from '@/shared/components/ui/StepRail';
import { toStepRail } from '../mappers/toStepRail';
import { getStep, STEPS } from '../utils/taxonomy';
import { useWizardStore } from '../store/wizard.store';
import { useTestImport } from '../hooks/useTestImport';
import type { EntityId } from '../dp-kit/types/entity';
import type { StepId } from '../types/wizard.types';
import type { TestRunDto, SampleFailure } from '../services/test_import.service';

interface TestImportScreenProps {
  readonly entityId?: EntityId;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

function PassRateBar({ passed, attempted }: { passed: number; attempted: number }): React.JSX.Element {
  const pct = attempted > 0 ? Math.round((passed / attempted) * 100) : 0;
  // Use flex ratio instead of percentage strings — percentage widths are unreliable
  // in React Native ScrollView children where the parent has no resolved pixel width.
  const passedFlex = Math.max(pct, 0);
  const failedFlex = Math.max(100 - pct, 0);
  return (
    <View className="mt-3 gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="font-body text-xs text-muted-foreground">Pass rate</Text>
        <Text className="font-body text-xs font-semibold text-foreground">{`${String(pct)}%`}</Text>
      </View>
      <View className="h-2 w-full rounded-full bg-muted overflow-hidden flex-row">
        {passedFlex > 0 ? <View className="h-full bg-primary" style={{ flex: passedFlex }} /> : null}
        {failedFlex > 0 ? <View className="h-full" style={{ flex: failedFlex }} /> : null}
      </View>
    </View>
  );
}

function SampleFailureRow({ item }: { item: SampleFailure }): React.JSX.Element {
  return (
    <View className="flex-row gap-2 py-1.5 border-b border-border">
      <Text className="font-body text-xs text-muted-foreground w-10 shrink-0">{String(item.row_index)}</Text>
      <Text className="font-body text-xs text-foreground w-28 shrink-0" numberOfLines={1}>{item.field}</Text>
      <Text className="font-body text-xs text-muted-foreground flex-1" numberOfLines={1}>
        {item.value != null ? String(item.value) : '—'}
      </Text>
      <Text className="font-body text-xs text-foreground w-32 shrink-0 text-right" numberOfLines={1}>{item.reason}</Text>
    </View>
  );
}

function CompleteView({
  testRun,
  onContinue,
}: {
  testRun: TestRunDto;
  onContinue?: () => void;
}): React.JSX.Element {
  const attempted = testRun.rows_attempted ?? 0;
  const passed = testRun.rows_passed ?? 0;
  const failed = testRun.rows_failed ?? 0;
  const hasFailed = failed > 0;
  const failureSummary = testRun.failure_summary ?? {};
  const sampleFailures = testRun.sample_failures ?? [];

  return (
    <View className="gap-5">
      <View className="rounded-lg border border-border bg-muted/30 p-4 gap-2">
        <View className="flex-row gap-4">
          <View className="flex-1 gap-0.5">
            <Text className="font-body text-xs text-muted-foreground">Rows tested</Text>
            <Text className="font-heading text-2xl font-bold text-foreground">{String(attempted)}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-body text-xs text-muted-foreground">Passed</Text>
            <Text className="font-heading text-2xl font-bold text-foreground">{String(passed)}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-body text-xs text-muted-foreground">Failed</Text>
            <Text
              className={`font-heading text-2xl font-bold ${hasFailed ? 'text-destructive' : 'text-foreground'}`}
            >
              {String(failed)}
            </Text>
          </View>
        </View>
        <PassRateBar passed={passed} attempted={attempted} />
      </View>

      {hasFailed && Object.keys(failureSummary).length > 0 ? (
        <View className="gap-2">
          <Text className="font-heading text-sm font-semibold text-foreground">Failure breakdown</Text>
          <View className="rounded-lg border border-border overflow-hidden">
            {Object.entries(failureSummary).map(([field, rules], idx, arr) => (
              <View key={field} className={`px-4 py-2.5${idx < arr.length - 1 ? ' border-b border-border' : ''}`}>
                <Text className="font-body text-sm text-foreground mb-1">{field}</Text>
                {Object.entries(rules).map(([rule, count]) => (
                  <View key={rule} className="flex-row items-center justify-between">
                    <Text className="font-body text-xs text-muted-foreground">{rule}</Text>
                    <Text className="font-body text-xs font-semibold text-destructive">{String(count)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {sampleFailures.length > 0 ? (
        <View className="gap-2">
          <Text className="font-heading text-sm font-semibold text-foreground">
            {`Sample failures (${String(sampleFailures.length)})`}
          </Text>
          <View className="rounded-lg border border-border overflow-hidden">
            <View className="flex-row gap-2 px-2 py-1.5 bg-muted">
              <Text className="font-body text-xs font-semibold text-muted-foreground w-10 shrink-0">Row</Text>
              <Text className="font-body text-xs font-semibold text-muted-foreground w-28 shrink-0">Field</Text>
              <Text className="font-body text-xs font-semibold text-muted-foreground flex-1">Value</Text>
              <Text className="font-body text-xs font-semibold text-muted-foreground w-32 shrink-0 text-right">Reason</Text>
            </View>
            <View className="px-2">
              {sampleFailures.map((item, idx) => (
                <SampleFailureRow key={`${item.row_index}-${item.field}-${String(idx)}`} item={item} />
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {onContinue != null ? (
        <Button onPress={onContinue} testID="test-import-continue">
          <Text className="text-sm font-semibold text-primary-foreground">Continue</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function TestImportScreen({
  entityId: entityIdProp,
  onBack: onBackProp,
  onContinue,
}: TestImportScreenProps): React.JSX.Element {
  const storeEntityId = useWizardStore((s) => s.entityId);
  const entityId = (entityIdProp ?? storeEntityId) as EntityId;

  const { testRun, isLoading, isTriggering, error, triggerRun } = useTestImport(entityId as EntityId);

  const handleBack = useCallback((): void => {
    onBackProp?.();
  }, [onBackProp]);

  const step = getStep('test');
  const stepRail = toStepRail('test' as StepId);

  return (
    <View className="flex-1 flex-col bg-background" testID="test-import-screen">
      <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">
        <StepRail rail={stepRail} />

        <View className="mt-8 mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-heading text-[18px] font-bold text-foreground">{step.label}</Text>
              <Text className="font-body text-xs text-muted-foreground">
                {`Step ${String(step.n)} of ${String(STEPS.length)}`}
              </Text>
            </View>
            <Text className="font-body text-sm text-muted-foreground">
              Validate your field mappings against the source data before importing.
            </Text>
          </View>

          {onBackProp != null ? (
            <Button variant="outline" onPress={handleBack} testID="test-import-back">
              <View className="flex-row items-center justify-center gap-1.5">
                <ArrowLeft size={14} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Back</Text>
              </View>
            </Button>
          ) : null}
        </View>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error != null ? (
          <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 gap-3">
            <Text className="font-body text-sm text-destructive">{error.message}</Text>
            <Button variant="outline" onPress={triggerRun} testID="test-import-retry">
              <View className="flex-row items-center justify-center gap-1.5">
                <RotateCcw size={14} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Retry</Text>
              </View>
            </Button>
          </View>
        ) : testRun == null ? (
          <View className="rounded-lg border border-border bg-muted/30 p-6 items-center gap-4">
            <Text className="font-body text-sm text-muted-foreground text-center">
              Run a test import to validate your field mappings against the source data. No data is written — this is a dry run.
            </Text>
            <Button onPress={triggerRun} disabled={isTriggering} testID="test-import-run">
              <View className="flex-row items-center justify-center gap-1.5">
                {isTriggering ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Play size={14} color={colors.primaryForeground} />
                )}
                <Text className="text-sm font-semibold text-primary-foreground">
                  {isTriggering ? 'Starting…' : 'Run Test Import'}
                </Text>
              </View>
            </Button>
          </View>
        ) : testRun.status === 'pending' || testRun.status === 'running' ? (
          <View className="items-center py-12 gap-3">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="font-body text-sm text-muted-foreground">Running validation…</Text>
            {testRun.rows_attempted != null ? (
              <Text className="font-body text-xs text-muted-foreground">
                {`${String(testRun.rows_attempted)} rows processed`}
              </Text>
            ) : null}
          </View>
        ) : testRun.status === 'failed' ? (
          <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 gap-3">
            <Text className="font-heading text-sm font-semibold text-destructive">Test run failed</Text>
            {testRun.error_detail != null ? (
              <Text className="font-body text-sm text-muted-foreground">{testRun.error_detail}</Text>
            ) : null}
            <Button variant="outline" onPress={triggerRun} disabled={isTriggering} testID="test-import-retry">
              <View className="flex-row items-center justify-center gap-1.5">
                <RotateCcw size={14} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">Retry</Text>
              </View>
            </Button>
          </View>
        ) : (
          <CompleteView testRun={testRun} onContinue={onContinue} />
        )}
      </ScrollView>
    </View>
  );
}
