import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { ArrowRight, Trash2, UserPen } from 'lucide-react-native';
import { Collapsible } from '@/shared/components/ui/Collapsible';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { FuzzyMatchBadge } from '@/features/migration/components/FuzzyMatchBadge/FuzzyMatchBadge';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { colors } from '@/config/theme';
import type { AccountMapping } from '@/features/migration/types/mapping.types';

const DEBOUNCE_MS = 300;
const ICON_SIZE = 16;

interface AccountTypeGroupProps {
  sourceType: string;
  targetType: string;
  confidence: number;
  accounts: readonly AccountMapping[];
  targetTypes: readonly string[];
  onTypeChange: (sourceType: string, newTargetType: string) => void;
  onAccountNameChange: (sourceType: string, accountIndex: number, newName: string) => void;
  onDeleteAccount: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  testID?: string;
}

interface AccountRowProps {
  account: AccountMapping;
  index: number;
  sourceType: string;
  onNameChange: (sourceType: string, accountIndex: number, newName: string) => void;
  onDelete: (sourceType: string, accountIndex: number, account: AccountMapping) => void;
  testID?: string;
}

const AccountRow = memo(({
  account,
  index,
  sourceType,
  onNameChange,
  onDelete,
  testID,
}: AccountRowProps) => {
  const [localName, setLocalName] = useState(account.target_name);
  const debouncedName = useDebounce(localName, DEBOUNCE_MS);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debouncedName !== account.target_name) {
      onNameChange(sourceType, index, debouncedName);
    }
  }, [debouncedName, sourceType, index, onNameChange, account.target_name]);

  useEffect(() => {
    setLocalName(account.target_name);
  }, [account.target_name]);

  const handleDelete = useCallback(() => {
    onDelete(sourceType, index, account);
  }, [onDelete, sourceType, index, account]);

  return (
    <View className="gap-1.5 border-b border-border/50 py-3 last:border-b-0" testID={testID}>
      <View className="flex-col gap-2 md:flex-row md:items-center">
        <View className="flex-row items-center gap-2 md:flex-1">
          <Text className="font-mono text-xs text-muted-foreground">{account.source_number}</Text>
          <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
            {account.source_name}
          </Text>
        </View>
        <ArrowRight size={ICON_SIZE} color={colors.mutedForeground} />
        <View className="flex-row items-center gap-2 md:flex-1">
          <View className="flex-1">
            <Input
              value={localName}
              onChangeText={setLocalName}
              inputClassName="h-8 text-xs"
              testID={testID !== undefined ? `${testID}-input` : undefined}
            />
          </View>
          <FuzzyMatchBadge score={account.score} size="sm" showLabel={false} />
          <Button variant="ghost" size="icon" onPress={handleDelete} accessibilityLabel="Delete account" className="h-8 w-8">
            <Trash2 size={ICON_SIZE} color={colors.destructive} />
          </Button>
        </View>
      </View>
      {account.remark.length > 0 && (
        <Text className="pl-1 text-xs text-muted-foreground">{account.remark}</Text>
      )}
      {account.user_changed === true && (
        <View className="flex-row items-center gap-1 pl-1">
          <UserPen size={12} color={colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground">
            Edited by {account.changed_by_name ?? 'Unknown'}
          </Text>
        </View>
      )}
    </View>
  );
});

AccountRow.displayName = 'AccountRow';

export const AccountTypeGroup = ({
  sourceType,
  targetType,
  confidence,
  accounts,
  targetTypes,
  onTypeChange,
  onAccountNameChange,
  onDeleteAccount,
  testID,
}: AccountTypeGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleTypeChange = useCallback(
    (newType: string) => {
      onTypeChange(sourceType, newType);
    },
    [onTypeChange, sourceType],
  );

  const selectOptions = useMemo<SelectOption[]>(
    () => targetTypes.map((t) => ({ label: t, value: t })),
    [targetTypes],
  );

  const headerContent = (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="font-heading text-sm font-bold text-card-foreground">{sourceType}</Text>
      <ArrowRight size={ICON_SIZE} color={colors.mutedForeground} />
      <View className="min-w-[140px]">
        <Select
          options={selectOptions}
          value={targetType}
          onValueChange={handleTypeChange}
          testID={testID !== undefined ? `${testID}-type-select` : undefined}
        />
      </View>
      <FuzzyMatchBadge score={confidence} size="sm" />
      <Badge variant="secondary">
        <Text className="text-xs font-medium text-secondary-foreground">
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </Text>
      </Badge>
    </View>
  );

  return (
    <Collapsible
      isOpen={isOpen}
      onToggle={handleToggle}
      title={headerContent}
      testID={testID}
    >
      {accounts.length === 0 ? (
        <EmptyState
          title="No mappings"
          description="No accounts mapped to this type group yet"
          testID={testID !== undefined ? `${testID}-empty` : 'account-group-empty'}
          className="py-6"
        />
      ) : (
        accounts.map((account, index) => (
          <AccountRow
            key={`${account.source_number}-${account.source_name}`}
            account={account}
            index={index}
            sourceType={sourceType}
            onNameChange={onAccountNameChange}
            onDelete={onDeleteAccount}
            testID={testID !== undefined ? `${testID}-row-${index}` : undefined}
          />
        ))
      )}
    </Collapsible>
  );
};
