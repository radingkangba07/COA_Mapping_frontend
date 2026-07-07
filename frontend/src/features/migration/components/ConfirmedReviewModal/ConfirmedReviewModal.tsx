import React, { useMemo } from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { X, CheckCircle2 } from 'lucide-react-native';
import { Badge } from '@/shared/components/ui/Badge';
import { useMigrationStore } from '@/features/migration/store/migration.store';
import { CONFIDENCE_THRESHOLDS } from '@/shared/constants/mapping-confidence';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import type { ConfidenceLevel } from '@/features/migration/types/mapping.types';

interface ConfirmedReviewModalProps {
  visible: boolean;
  level: ConfidenceLevel | null;
  onClose: () => void;
}

interface ReviewRow {
  readonly key: string;
  readonly sourceNumber: string;
  readonly sourceName: string;
  readonly sourceType: string;
  readonly targetNumber?: string | null;
  readonly targetName: string;
  readonly targetType: string;
  readonly score: number;
}

function getScoreColor(score: number): string {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH)
    return 'text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM)
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

const LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  high: 'High Score (90%+)',
  medium: 'Medium Score (70–89%)',
  low: 'Low Score (<70%)',
};

export function ConfirmedReviewModal({
  visible,
  level,
  onClose,
}: ConfirmedReviewModalProps): React.JSX.Element {
  const groupedMappings = useMigrationStore((s) => s.groupedMappings);
  const { HIGH, MEDIUM } = CONFIDENCE_THRESHOLDS;

  const rows = useMemo((): readonly ReviewRow[] => {
    const all = groupedMappings.flatMap((group) =>
      group.accounts
        .filter((account) => account.is_active !== false)
        .map((account, idx) => ({
          key: `${group.source_type}-${account.source_number}-${idx}`,
          sourceNumber: account.source_number,
          sourceName: account.source_name,
          sourceType: group.source_type,
          targetNumber: account.target_number,
          targetName: account.target_name,
          targetType: group.target_type,
          score: Math.round(account.score),
          status: (account as { status?: string }).status,
        })),
    );

    if (level === 'high') return all.filter((r) => r.score >= HIGH);
    if (level === 'medium') return all.filter((r) => r.score >= MEDIUM && r.score < HIGH);
    if (level === 'low') return all.filter((r) => r.score < MEDIUM);
    return all.filter((r) => r.status === 'confirmed');
  }, [groupedMappings, level, HIGH, MEDIUM]);

  const title = level !== null ? LEVEL_LABELS[level] : 'All Confirmed Accounts';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="confirmed-review-modal"
    >
      <View className="flex-1 bg-background">
        {/* Modal header */}
        <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={18} color={colors.primary} />
            <Text className="font-heading text-base font-semibold text-foreground">{title}</Text>
            <Badge
              variant="outline"
              className="border-blue-200 dark:border-blue-800 bg-card px-2 py-0.5"
            >
              <Text className="text-xs font-medium text-primary dark:text-blue-400">
                {rows.length} accounts
              </Text>
            </Badge>
          </View>
          <Pressable
            onPress={onClose}
            className="rounded-full p-1.5 bg-gray-100 dark:bg-[#2D2D2D]"
            accessibilityLabel="Close review"
            testID="confirmed-review-modal-close"
          >
            <X size={16} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Table */}
        <ScrollView>
          {/* Table header */}
          <View className="flex-row bg-gray-100 dark:bg-[#2D2D2D] border-b border-border px-4 py-2">
            <View className="w-[8%]">
              <Text className="text-xs font-semibold text-muted-foreground">Src #</Text>
            </View>
            <View className="w-[22%]">
              <Text className="text-xs font-semibold text-muted-foreground">Source Account</Text>
            </View>
            <View className="w-[12%]">
              <Text className="text-xs font-semibold text-muted-foreground">Source Type</Text>
            </View>
            <View className="w-[8%]">
              <Text className="text-xs font-semibold text-muted-foreground">Tgt #</Text>
            </View>
            <View className="w-[22%]">
              <Text className="text-xs font-semibold text-muted-foreground">Target Account</Text>
            </View>
            <View className="w-[12%]">
              <Text className="text-xs font-semibold text-muted-foreground">Target Type</Text>
            </View>
            <View className="w-[16%] items-center">
              <Text className="text-xs font-semibold text-muted-foreground">Score</Text>
            </View>
          </View>

          {rows.length === 0 ? (
            <View className="items-center py-12">
              <Text className="font-body text-sm text-muted-foreground">No confirmed accounts found.</Text>
            </View>
          ) : (
            rows.map((row, idx) => {
              const scoreColor = getScoreColor(row.score);
              return (
                <View
                  key={row.key}
                  className={cn(
                    'flex-row items-center px-4 py-2.5 border-b border-border',
                    idx % 2 === 0 ? 'bg-card' : 'bg-surface-highlight',
                  )}
                >
                  <View className="w-[8%]">
                    <Text className="font-mono text-xs text-muted-foreground">{row.sourceNumber}</Text>
                  </View>
                  <View className="w-[22%]">
                    <Text className="text-xs text-foreground" numberOfLines={1}>{row.sourceName}</Text>
                  </View>
                  <View className="w-[12%]">
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>{row.sourceType}</Text>
                  </View>
                  <View className="w-[8%]">
                    <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
                      {row.targetNumber ?? ''}
                    </Text>
                  </View>
                  <View className="w-[22%]">
                    <Text className="text-xs text-foreground" numberOfLines={1}>{row.targetName}</Text>
                  </View>
                  <View className="w-[12%]">
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>{row.targetType}</Text>
                  </View>
                  <View className="w-[16%] items-center">
                    <Badge className={cn(scoreColor, 'px-1.5 py-0.5')}>
                      <Text className={cn('text-xs font-mono font-medium', scoreColor)}>
                        {row.score}%
                      </Text>
                    </Badge>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
