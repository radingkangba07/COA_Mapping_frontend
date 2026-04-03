import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight, ChevronDown, ChevronRight, Edit3, FolderTree, Trash2, X } from 'lucide-react-native';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import type { AccountMapping } from '@/features/migration/types/mapping.types';

// ─── Score & Remark Helpers ─────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  if (score >= 50) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

function getRemarkText(account: AccountMapping): string {
  if (account.user_changed === true) {
    return account.changed_by_name ? `Changed by ${account.changed_by_name}` : 'User Changed';
  }
  if (account.score >= 70) return 'AI Suggestion';
  return 'Account Name Mapping';
}

function getRemarkColor(account: AccountMapping): string {
  if (account.user_changed === true) return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
  if (account.score >= 70) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
  return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#2D2D2D]';
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AccountTypeGroupProps {
  sourceType: string;
  targetType: string;
  confidence: number;
  accounts: readonly AccountMapping[];
  targetTypes: readonly string[];
  targetAccountNames: readonly string[];
  onTypeChange: (sourceType: string, newTargetType: string) => void;
  onAccountNameChange: (sourceType: string, accountIndex: number, newName: string, sourceName?: string) => void;
  onDeleteAccount: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  testID?: string;
}

// ─── Account Row ────────────────────────────────────────────────────────────

interface AccountRowProps {
  account: AccountMapping;
  index: number;
  sourceType: string;
  isEditing: boolean;
  targetAccountOptions: readonly SelectOption[];
  onEditClick: (index: number) => void;
  onNameChange: (sourceType: string, accountIndex: number, newName: string, sourceName?: string) => void;
  onDelete: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  testID?: string;
}

const AccountRow = memo(({
  account,
  index,
  sourceType,
  isEditing,
  targetAccountOptions,
  onEditClick,
  onNameChange,
  onDelete,
  testID,
}: AccountRowProps) => {
  const handleSelectChange = useCallback(
    (value: string) => {
      onNameChange(sourceType, index, value === 'unmatched' ? '' : value, account.source_name);
      onEditClick(index); // close editing
    },
    [onNameChange, onEditClick, sourceType, index, account.source_name],
  );

  const handleEdit = useCallback(() => {
    onEditClick(index);
  }, [onEditClick, index]);

  const handleDelete = useCallback(() => {
    onDelete(sourceType, index, account);
  }, [onDelete, sourceType, index, account]);

  const score = Math.round(account.score);
  const scoreColor = getScoreColor(account.score);
  const remarkText = getRemarkText(account);
  const remarkColor = getRemarkColor(account);

  return (
    <View
      className="flex-row items-center py-2 px-4 hover:bg-surface-highlight"
      testID={testID}
    >
      {/* Account # */}
      <View className="w-[8%]">
        <Text className="font-mono text-xs text-muted-foreground">
          {account.source_number || '-'}
        </Text>
      </View>

      {/* Source Account */}
      <View className="w-[25%]">
        <Text className="text-sm text-foreground" numberOfLines={1}>
          {account.source_name}
        </Text>
      </View>

      {/* Arrow */}
      <View className="w-[5%] items-center">
        <ArrowRight size={18} color={colors.mutedForeground} strokeWidth={2.5} />
      </View>

      {/* Target Account */}
      <View className="w-[22%]">
        {isEditing ? (
          <Select
            options={[...targetAccountOptions]}
            value={account.target_name || 'unmatched'}
            onValueChange={handleSelectChange}
            placeholder="Select target account"
            testID={testID !== undefined ? `${testID}-select` : undefined}
          />
        ) : (
          <Text
            className={cn(
              'text-sm',
              account.target_name ? 'text-foreground' : 'text-muted-foreground italic',
            )}
            numberOfLines={1}
          >
            {account.target_name || 'Not mapped'}
          </Text>
        )}
      </View>

      {/* Score */}
      <View className="w-[10%] items-center">
        <Badge className={cn(scoreColor, 'px-1.5 py-0.5')}>
          <Text className={cn('text-xs font-mono font-medium', scoreColor)}>
            {score}%
          </Text>
        </Badge>
      </View>

      {/* Remark */}
      <View className="w-[20%] items-center">
        <Badge variant="outline" className={cn('px-1.5 py-0.5', remarkColor)}>
          <Text className={cn('text-xs', remarkColor)}>
            {remarkText}
          </Text>
        </Badge>
      </View>

      {/* Action */}
      <View className="w-[10%] flex-row items-center justify-center gap-1">
        <Button
          size="sm"
          variant={isEditing ? 'default' : 'outline'}
          onPress={handleEdit}
          className="h-7 px-2"
          accessibilityLabel={isEditing ? 'Cancel editing' : 'Edit target account'}
        >
          <View className="flex-row items-center gap-1">
            {isEditing ? (
              <>
                <X size={12} color={colors.primaryForeground} />
                <Text className="text-xs font-medium text-primary-foreground">Cancel</Text>
              </>
            ) : (
              <>
                <Edit3 size={12} color={colors.foreground} />
                <Text className="text-xs font-medium text-foreground">Edit</Text>
              </>
            )}
          </View>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={handleDelete}
          className="h-7 px-2 border-red-200 dark:border-red-800"
          accessibilityLabel="Delete account"
        >
          <Trash2 size={12} color={colors.destructive} />
        </Button>
      </View>
    </View>
  );
});

AccountRow.displayName = 'AccountRow';

// ─── Account Type Group ─────────────────────────────────────────────────────

export const AccountTypeGroup = ({
  sourceType,
  targetType,
  confidence,
  accounts,
  targetTypes,
  targetAccountNames,
  onTypeChange,
  onAccountNameChange,
  onDeleteAccount,
  testID,
}: AccountTypeGroupProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleEditClick = useCallback((idx: number) => {
    setEditingRow((prev) => (prev === idx ? null : idx));
  }, []);

  const targetAccountOptions = useMemo<SelectOption[]>(
    () => [
      { label: '-- Select Account --', value: 'unmatched' },
      ...targetAccountNames.map((n) => ({ label: n, value: n })),
    ],
    [targetAccountNames],
  );

  const isMapped = targetType.length > 0 && targetType !== 'unmatched';

  return (
    <View className="mt-2" testID={testID}>
      {/* Group header row — card with border */}
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center rounded-lg border border-border bg-card px-4 py-3 hover:bg-surface-highlight"
        accessibilityRole="button"
        accessibilityLabel={`${sourceType} group, ${accounts.length} accounts`}
      >
        {/* Left side: chevron + folder + source type + count (spans Account # + Source Account columns) */}
        <View className="flex-row items-center gap-2 w-[33%]">
          {isOpen ? (
            <ChevronDown size={16} color={colors.mutedForeground} />
          ) : (
            <ChevronRight size={16} color={colors.mutedForeground} />
          )}
          <FolderTree size={16} color="#2563EB" />
          <Text className="font-heading text-sm font-semibold text-foreground">
            {sourceType}
          </Text>
          <Badge variant="outline" className="px-1.5 py-0.5">
            <Text className="text-xs text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </Text>
          </Badge>
        </View>

        {/* Middle: blank (Arrow + Target Account + Score + Remark columns) */}
        <View className="w-[57%]" />

        {/* Right side: target type badge + Mapped/Unmapped badge (Action column) */}
        <View className="w-[10%] flex-row items-center justify-end gap-2">
          {isMapped ? (
            <Badge className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5">
              <Text className="text-xs font-medium text-blue-800 dark:text-blue-400">{targetType}</Text>
            </Badge>
          ) : (
            <Text className="text-xs text-muted-foreground italic">Not mapped</Text>
          )}
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5',
              isMapped
                ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
            )}
          >
            <Text
              className={cn(
                'text-xs font-medium',
                isMapped ? 'text-green-800 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {isMapped ? 'Mapped' : 'Unmapped'}
            </Text>
          </Badge>
        </View>
      </Pressable>

      {/* Expanded account rows */}
      {isOpen && accounts.length > 0 && (
        <View>
          {accounts.map((account, index) => (
            <AccountRow
              key={`${account.source_number}-${account.source_name}`}
              account={account}
              index={index}
              sourceType={sourceType}
              isEditing={editingRow === index}
              targetAccountOptions={targetAccountOptions}
              onEditClick={handleEditClick}
              onNameChange={onAccountNameChange}
              onDelete={onDeleteAccount}
              testID={testID !== undefined ? `${testID}-row-${index}` : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
};