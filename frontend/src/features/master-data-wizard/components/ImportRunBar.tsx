import React from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/config/theme';
import type { ImportRunDto } from '../services/test_import.service';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(ms)} ms`;
  const totalSecs = ms / 1000;
  if (totalSecs < 60) return `${totalSecs.toFixed(1)} s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.floor(totalSecs % 60);
  return `${String(mins)}m ${String(secs)}s`;
}

export function ImportRunBar({ run }: { run: ImportRunDto }): React.JSX.Element {
  const isComplete = run.status === 'complete';
  const isRunning = run.status === 'pending' || run.status === 'running';

  return (
    <View className="flex-row items-center justify-between border-b border-border px-4 py-2.5 gap-3">
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
        <View
          className="h-[6px] w-[6px] rounded-full"
          style={{
            backgroundColor: isComplete
              ? colors.success
              : isRunning
                ? colors.accent
                : colors.destructive,
          }}
        />
        <Text className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recorded Run
        </Text>
        <Text className="font-body text-xs" style={{ color: isComplete ? colors.success : colors.mutedForeground }}>
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
