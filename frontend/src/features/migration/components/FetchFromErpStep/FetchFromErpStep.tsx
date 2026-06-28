import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { AlertCircle, CheckCircle, Database, DownloadCloud, RefreshCw } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { colors } from '@/config/theme';
import type { CoaRow, RequestStatus } from '@/features/projects/types/project-scope.types';

const PREVIEW_COLUMN_LIMIT = 5;

export interface FetchFromErpStepProps {
  sourceErpName?: string;
  targetErpName?: string;
  connectionReady: boolean;
  status: RequestStatus;
  progress: number;
  counts: { source: number; target: number };
  sampleSource: readonly CoaRow[];
  sampleTarget: readonly CoaRow[];
  errorMessage?: string | null;
  onFetch: () => void;
  onRefetch: () => void;
  testID?: string;
}

export function FetchFromErpStep({
  sourceErpName,
  targetErpName,
  connectionReady,
  status,
  progress,
  counts,
  sampleSource,
  sampleTarget,
  errorMessage,
  onFetch,
  onRefetch,
  testID,
}: FetchFromErpStepProps): React.JSX.Element {
  const rootTestID = testID ?? 'fetch-from-erp-step';

  // GATED: connection must be tested before any fetch is allowed.
  if (!connectionReady) {
    return (
      <View testID={rootTestID} className="gap-3">
        <ErpStepHeader sourceErpName={sourceErpName} targetErpName={targetErpName} />
        <View
          testID={`${rootTestID}-gated`}
          className="flex-row items-center gap-2 rounded-md border border-border bg-card px-3 py-3"
        >
          <AlertCircle size={16} color={colors.mutedForeground} />
          <Text className="flex-1 font-body text-sm text-muted-foreground">
            Test the MCP connection before fetching the chart of accounts.
          </Text>
        </View>
        <View className="flex-row">
          <Button
            disabled
            onPress={onFetch}
            accessibilityLabel="Fetch from ERP (connection not ready)"
            testID={`${rootTestID}-fetch-button`}
          >
            <View className="flex-row items-center gap-2">
              <DownloadCloud size={16} color={colors.primaryForeground} />
              <Text className="font-body text-sm font-medium text-primary-foreground">
                Fetch from ERP
              </Text>
            </View>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View testID={rootTestID} className="gap-3">
      <ErpStepHeader sourceErpName={sourceErpName} targetErpName={targetErpName} />

      {status === 'idle' ? (
        <View className="flex-row">
          <Button
            onPress={onFetch}
            accessibilityLabel="Fetch chart of accounts from ERP"
            testID={`${rootTestID}-fetch-button`}
          >
            <View className="flex-row items-center gap-2">
              <DownloadCloud size={16} color={colors.primaryForeground} />
              <Text className="font-body text-sm font-medium text-primary-foreground">
                Fetch from ERP
              </Text>
            </View>
          </Button>
        </View>
      ) : null}

      {status === 'loading' ? (
        <View testID={`${rootTestID}-loading`} className="gap-2">
          <View className="flex-row items-center gap-2">
            <Spinner size="sm" />
            <Text className="font-body text-sm text-muted-foreground">
              Fetching chart of accounts…
            </Text>
            <Text className="font-mono text-sm text-muted-foreground">
              {progress}%
            </Text>
          </View>
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </View>
        </View>
      ) : null}

      {status === 'success' ? (
        <View testID={`${rootTestID}-success`} className="gap-3">
          <View className="flex-row gap-2">
            <CountChip
              icon={<CheckCircle size={16} color={colors.success} />}
              label="Source accounts"
              value={counts.source}
            />
            <CountChip
              icon={<Database size={16} color={colors.primary} />}
              label="Target accounts"
              value={counts.target}
            />
          </View>

          <SamplePreviewTable
            title="Sample — Source COA"
            rows={sampleSource}
            testID={`${rootTestID}-sample-source`}
          />

          {sampleTarget.length > 0 ? (
            <SamplePreviewTable
              title="Sample — Target COA"
              rows={sampleTarget}
              testID={`${rootTestID}-sample-target`}
            />
          ) : null}

          <View className="flex-row">
            <Button
              variant="outline"
              size="sm"
              onPress={onRefetch}
              accessibilityLabel="Re-fetch chart of accounts from ERP"
              testID={`${rootTestID}-refetch-button`}
            >
              <View className="flex-row items-center gap-2">
                <RefreshCw size={14} color={colors.foreground} />
                <Text className="font-body text-xs font-medium text-foreground">
                  Re-fetch
                </Text>
              </View>
            </Button>
          </View>
        </View>
      ) : null}

      {status === 'error' ? (
        <View testID={`${rootTestID}-error`} className="flex-row items-center gap-2">
          <AlertCircle size={16} color={colors.destructive} />
          <Text className="flex-1 font-body text-sm text-destructive">
            {errorMessage ?? 'Failed to fetch chart of accounts.'}
          </Text>
          <Button
            variant="outline"
            size="sm"
            onPress={onRefetch}
            accessibilityLabel="Retry fetch from ERP"
            testID={`${rootTestID}-retry-button`}
          >
            <View className="flex-row items-center gap-2">
              <RefreshCw size={14} color={colors.foreground} />
              <Text className="font-body text-xs font-medium text-foreground">
                Retry
              </Text>
            </View>
          </Button>
        </View>
      ) : null}
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ErpStepHeaderProps {
  sourceErpName?: string;
  targetErpName?: string;
}

function ErpStepHeader({ sourceErpName, targetErpName }: ErpStepHeaderProps): React.JSX.Element {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Database size={16} color={colors.foreground} />
        <Text className="font-heading text-base font-semibold text-foreground">
          Fetch Chart of Accounts from ERP
        </Text>
      </View>
      {sourceErpName && targetErpName ? (
        <Text className="font-body text-sm text-muted-foreground">
          {sourceErpName} → {targetErpName}
        </Text>
      ) : null}
    </View>
  );
}

interface CountChipProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function CountChip({ icon, label, value }: CountChipProps): React.JSX.Element {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      {icon}
      <View className="flex-1">
        <Text className="font-body text-xs text-muted-foreground">{label}</Text>
        <Text className="font-mono text-base font-semibold text-foreground">{value}</Text>
      </View>
    </View>
  );
}

interface SamplePreviewTableProps {
  title: string;
  rows: readonly CoaRow[];
  testID: string;
}

function SamplePreviewTable({ title, rows, testID }: SamplePreviewTableProps): React.JSX.Element | null {
  const firstRow = rows[0];
  if (firstRow === undefined) {
    return null;
  }
  const columns = Object.keys(firstRow).slice(0, PREVIEW_COLUMN_LIMIT);

  return (
    <View testID={testID} className="gap-1">
      <Text className="font-body text-sm font-medium text-foreground">{title}</Text>
      <ScrollView horizontal className="rounded-md border border-border">
        <View>
          <View className="flex-row border-b border-border bg-muted">
            {columns.map((column) => (
              <Text
                key={column}
                className="min-w-[96px] px-2 py-1.5 font-mono text-xs font-medium text-muted-foreground"
              >
                {column}
              </Text>
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View
              key={`${testID}-row-${rowIndex}`}
              className="flex-row border-b border-border last:border-b-0"
            >
              {columns.map((column) => (
                <Text
                  key={`${column}-${rowIndex}`}
                  className="min-w-[96px] px-2 py-1.5 font-mono text-xs text-foreground"
                >
                  {String(row[column] ?? '')}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
