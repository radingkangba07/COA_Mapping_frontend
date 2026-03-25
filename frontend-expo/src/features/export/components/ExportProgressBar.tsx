import React from 'react';
import { View, Text } from 'react-native';
import { Progress } from '@/shared/components/ui/Progress';
import { cn } from '@/shared/utils/string.utils';

interface ExportProgressBarProps {
  readonly isExporting: boolean;
  readonly progress?: number;
  readonly className?: string;
  readonly testID?: string;
}

function getStatusLabel(progress: number): string {
  if (progress < 50) {
    return 'Preparing...';
  }
  return 'Downloading...';
}

export function ExportProgressBar({
  isExporting,
  progress = 0,
  className,
  testID,
}: ExportProgressBarProps): React.JSX.Element | null {
  if (!isExporting) {
    return null;
  }

  const label = getStatusLabel(progress);

  return (
    <View testID={testID} className={cn('gap-2', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground font-body">
          {label}
        </Text>
        <Text className="text-xs text-muted-foreground font-mono">
          {progress}%
        </Text>
      </View>
      <Progress value={progress} variant="default" size="default" />
    </View>
  );
}
