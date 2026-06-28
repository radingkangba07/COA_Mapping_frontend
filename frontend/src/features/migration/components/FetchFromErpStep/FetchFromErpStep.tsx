import React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle, CheckCircle, Database, DownloadCloud } from 'lucide-react-native';
import { Button } from '@/shared/components/ui/Button';
import { colors } from '@/config/theme';
import type { CoaRow, RequestStatus } from '@/features/projects/types/project-scope.types';

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

      {/* TODO(DA-80): replace with progress bar + percentage during fetch. */}
      {status === 'loading' ? (
        <Text testID={`${rootTestID}-loading`} className="font-body text-sm text-muted-foreground">
          Fetching chart of accounts… {progress}%
        </Text>
      ) : null}

      {/* TODO(DA-81): replace with counts summary + sample preview tables. */}
      {status === 'success' ? (
        <View testID={`${rootTestID}-success`} className="flex-row items-center gap-2">
          <CheckCircle size={16} color={colors.success} />
          <Text className="font-body text-sm text-foreground">
            Fetched {counts.source} source / {counts.target} target accounts
            {' '}({sampleSource.length}/{sampleTarget.length} sampled).
          </Text>
          {/* TODO(DA-82): re-fetch control wired to onRefetch. */}
        </View>
      ) : null}

      {/* TODO(DA-80/DA-82): full error UI with retry via onRefetch. */}
      {status === 'error' ? (
        <View testID={`${rootTestID}-error`} className="flex-row items-center gap-2">
          <AlertCircle size={16} color={colors.destructive} />
          <Text className="flex-1 font-body text-sm text-destructive">
            {errorMessage ?? 'Failed to fetch chart of accounts.'}
          </Text>
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
