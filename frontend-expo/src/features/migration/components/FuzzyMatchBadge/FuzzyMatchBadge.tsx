import React from 'react';
import { Text } from 'react-native';
import { Badge } from '@/shared/components/ui/Badge';
import { cn } from '@/shared/utils/string.utils';
import {
  getConfidenceLevel,
  getConfidenceBgClass,
  getConfidenceTextClass,
} from '@/shared/constants/mapping-confidence';

interface FuzzyMatchBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  testID?: string;
}

const CONFIDENCE_LABELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

export const FuzzyMatchBadge = ({
  score,
  showLabel = true,
  size = 'md',
  testID,
}: FuzzyMatchBadgeProps) => {
  const level = getConfidenceLevel(score);
  const bgClass = getConfidenceBgClass(score);
  const textClass = getConfidenceTextClass(score);
  const label = CONFIDENCE_LABELS[level];
  const rounded = Math.round(score);

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2.5 py-0.5';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge className={cn(bgClass, sizeClasses)} testID={testID}>
      <Text className={cn('font-mono font-medium', textSizeClass, textClass)}>
        {rounded}%{showLabel ? ` ${label}` : ''}
      </Text>
    </Badge>
  );
};
