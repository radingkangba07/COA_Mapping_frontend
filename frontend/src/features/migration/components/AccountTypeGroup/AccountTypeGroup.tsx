import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowRight, ChevronDown, ChevronRight, Edit3, FolderTree, Trash2, X } from 'lucide-react-native';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { colors } from '@/config/theme';
import { cn } from '@/shared/utils/string.utils';
import type { AccountMapping } from '@/features/migration/types/mapping.types';
import { selectionKey, computeTriState } from '@/features/migration/utils/selection.utils';

export type ScoreSortDirection = 'none' | 'asc' | 'desc';

// ─── Score & Remark Helpers ─────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  if (score >= 50) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

function isUserChanged(account: AccountMapping): boolean {
  // Local edits set user_changed:true optimistically. After Save + refetch,
  // that flag is gone but the backend returns mapping_source:"user".
  return account.user_changed === true || account.mapping_source === 'user';
}

function getRemarkText(account: AccountMapping): string {
  if (isUserChanged(account)) {
    return account.changed_by_name ? `Changed by ${account.changed_by_name}` : 'User Changed';
  }
  if (account.score >= 70) return 'AI suggestion';
  // Show the backend's raw mapping_status DB column when available, so the
  // Remark badge reflects the persisted status value rather than a static
  // label. Falls back to the original label when the column is unset.
  const status = account.mapping_status?.trim();
  return status !== undefined && status.length > 0 ? status : 'Account Name Mapping';
}

function getRemarkColor(account: AccountMapping): string {
  if (isUserChanged(account)) return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
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
  targetAccounts: readonly { name: string; number: string }[];
  onTypeChange: (sourceType: string, newTargetType: string) => void;
  onAccountNameChange: (sourceType: string, accountIndex: number, newName: string, sourceName?: string, suggestionId?: string, targetNumber?: string | null) => void;
  onDeleteAccount: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  forceOpen?: boolean;
  scoreSortDirection?: ScoreSortDirection;
  testID?: string;
  // ─── Selection ──────────────────────────────────────────────────────────────
  selection?: Record<string, true>;
  // Keys already confirmed — their checkboxes render checked but cannot be
  // toggled until the user presses "Edit & Reconfirm" for that band.
  lockedKeys?: Record<string, true>;
  onToggleGroupSelect?: (checked: boolean, groupKeys: string[]) => void;
  onToggleRowSelect?: (sourceType: string, account: AccountMapping) => void;
}

// ─── Account Row ────────────────────────────────────────────────────────────

interface AccountRowProps {
  account: AccountMapping;
  index: number;
  sourceType: string;
  isEditing: boolean;
  targetAccountOptions: readonly SelectOption[];
  targetNumberByName: Record<string, string>;
  onEditClick: (index: number) => void;
  onNameChange: (sourceType: string, accountIndex: number, newName: string, sourceName?: string, suggestionId?: string, targetNumber?: string | null) => void;
  onDelete: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  testID?: string;
  isSelected?: boolean;
  isLocked?: boolean;
  onToggleSelect?: (sourceType: string, account: AccountMapping) => void;
}

const AccountRow = memo(({
  account,
  index,
  sourceType,
  isEditing,
  targetAccountOptions,
  targetNumberByName,
  onEditClick,
  onNameChange,
  onDelete,
  testID,
  isSelected = false,
  isLocked = false,
  onToggleSelect,
}: AccountRowProps) => {
  const handleSelectChange = useCallback(
    (value: string) => {
      const name = value === 'unmatched' ? '' : value;
      const targetNumber = name ? (targetNumberByName[name] ?? null) : null;
      onNameChange(sourceType, index, name, account.source_name, account.suggestion_id, targetNumber);
      onEditClick(index); // close editing
    },
    [onNameChange, onEditClick, targetNumberByName, sourceType, index, account.source_name, account.suggestion_id],
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
      className="flex-row items-center px-6 py-2.5 border-t border-border hover:bg-muted/20"
      testID={testID}
    >
      {/* Checkbox */}
      <View className="w-8 items-center justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect?.(sourceType, account)}
          isDisabled={isLocked}
          className="-ml-10"
          testID={testID ? `${testID}-checkbox` : undefined}
        />
      </View>

      {/* Account # */}
      <View className="w-[8%] pr-2">
        <Text className="font-mono text-xs text-muted-foreground">
          {account.source_number || '-'}
        </Text>
      </View>

      {/* Source Account */}
      <View className="w-[26%] pr-4">
        <Text className="text-sm text-foreground">
          {account.source_name}
        </Text>
      </View>

      {/* Arrow */}
      <View className="w-[2%] items-center">
        <ArrowRight size={16} color={colors.mutedForeground} strokeWidth={2} />
      </View>

      {/* Target Account # */}
      <View className="w-[7%] pl-2 pr-1">
        <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
          {account.target_number || ''}
        </Text>
      </View>

      {/* Target Account */}
      <View className="w-[26%] pr-4">
        {isEditing ? (
          <Select
            options={[...targetAccountOptions]}
            value={account.target_name || 'unmatched'}
            onValueChange={handleSelectChange}
            placeholder="Select target account"
            searchable
            testID={testID !== undefined ? `${testID}-select` : undefined}
          />
        ) : (
          <Text
            className={cn(
              'text-sm',
              account.target_name ? 'text-foreground' : 'text-muted-foreground italic',
            )}
          >
            {account.target_name || 'Not mapped'}
          </Text>
        )}
      </View>

      {/* Score */}
      <View className="w-[8%] items-center">
        <Badge className={cn(scoreColor, 'px-1.5 py-0.5')}>
          <Text className={cn('text-xs font-mono font-medium', scoreColor)}>
            {score}%
          </Text>
        </Badge>
      </View>

      {/* Remark */}
      <View className="w-[13%] items-center">
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
  targetAccounts,
  onTypeChange,
  onAccountNameChange,
  onDeleteAccount,
  forceOpen,
  scoreSortDirection = 'none',
  testID,
  selection = {},
  lockedKeys = {},
  onToggleGroupSelect,
  onToggleRowSelect,
}: AccountTypeGroupProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingRow, setEditingRow] = useState<number | null>(null);

  // Sync with global expand/collapse all signal.
  useEffect(() => {
    if (forceOpen !== undefined) setIsOpen(forceOpen);
  }, [forceOpen]);

  // Reset editing state when the accounts array changes (e.g. filter applied)
  // so a stale editingRow index doesn't open the Select for the wrong row.
  useEffect(() => {
    setEditingRow(null);
  }, [accounts]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleEditClick = useCallback((idx: number) => {
    setEditingRow((prev) => (prev === idx ? null : idx));
  }, []);

  const targetAccountOptions = useMemo<SelectOption[]>(
    () => [
      { label: '-- Select Account --', value: 'unmatched' },
      ...targetAccounts.map(({ name }) => ({ label: name, value: name })),
    ],
    [targetAccounts],
  );

  const targetNumberByName = useMemo<Record<string, string>>(
    () => Object.fromEntries(targetAccounts.map(({ name, number }) => [name, number])),
    [targetAccounts],
  );

  const groupKeys = useMemo(
    () => accounts.map((a) => selectionKey(sourceType, a)),
    [accounts, sourceType],
  );

  const isGroupFullyLocked = useMemo(
    () => groupKeys.length > 0 && groupKeys.every((k) => lockedKeys[k]),
    [groupKeys, lockedKeys],
  );

  const groupTriState = useMemo(
    () => computeTriState(selection, groupKeys),
    [selection, groupKeys],
  );

  const isMapped = targetType.length > 0 && targetType !== 'unmatched';
  const sortedAccounts = useMemo(
    () => {
      const indexed = accounts.map((account, index) => ({ account, index }));
      if (scoreSortDirection === 'none') return indexed;

      return [...indexed].sort((a, b) => {
        const scoreDiff = scoreSortDirection === 'asc'
          ? a.account.score - b.account.score
          : b.account.score - a.account.score;
        if (scoreDiff !== 0) return scoreDiff;
        return a.index - b.index;
      });
    },
    [accounts, scoreSortDirection],
  );

  return (
    <View className="border-t border-border" testID={testID}>
      {/* Group header row */}
      <View className="flex-row items-center bg-muted/40 px-6 py-2.5 hover:bg-muted/60">
        {/* Checkbox — must be a sibling of the collapse Pressable, not a child (AC9) */}
        <View className="w-8 items-center justify-center">
          <Checkbox
            checked={groupTriState}
            onCheckedChange={(checked) => onToggleGroupSelect?.(checked, groupKeys)}
            isDisabled={isGroupFullyLocked}
            className="-ml-10"
            testID={testID ? `${testID}-group-checkbox` : undefined}
          />
        </View>

        {/* Collapse toggle wraps ONLY chevron + folder + type label + count */}
        <Pressable
          onPress={handleToggle}
          className="flex-row items-center gap-2 flex-1"
          accessibilityRole="button"
          accessibilityLabel={`${sourceType} group, ${accounts.length} accounts`}
        >
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
        </Pressable>

        {/* Right side: target type badge + Mapped/Unmapped badge — outside the collapse toggle */}
        <View className="flex-row items-center justify-end gap-2">
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
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
            )}
          >
            <Text
              className={cn(
                'text-xs font-medium',
                isMapped ? 'text-primary dark:text-blue-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {isMapped ? 'Mapped' : 'Unmapped'}
            </Text>
          </Badge>
        </View>
      </View>

      {/* Expanded account rows */}
      {isOpen && accounts.length > 0 && (
        <View>
          {sortedAccounts.map(({ account, index }, displayIndex) => (
            <AccountRow
              key={account.suggestion_id ?? `${account.source_number ?? ''}-${account.source_name}-${index}`}
              account={account}
              index={index}
              sourceType={sourceType}
              isEditing={editingRow === index}
              targetAccountOptions={targetAccountOptions}
              targetNumberByName={targetNumberByName}
              onEditClick={handleEditClick}
              onNameChange={onAccountNameChange}
              onDelete={onDeleteAccount}
              testID={testID !== undefined ? `${testID}-row-${displayIndex}` : undefined}
              isSelected={!!selection[selectionKey(sourceType, account)]}
              isLocked={!!lockedKeys[selectionKey(sourceType, account)]}
              onToggleSelect={onToggleRowSelect}
            />
          ))}
        </View>
      )}
    </View>
  );
};
