import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';
import { WebDropdown } from './WebDropdown';
import { NativeModal } from './NativeModal';
import type { ERPItem } from './types';

interface ERPComboboxProps {
  value: string | null;
  onSelect: (erpId: string) => void;
  erpSystems: ERPItem[];
  placeholder?: string;
  excludeId?: string;
  testID?: string;
}

export const ERPCombobox = ({
  value,
  onSelect,
  erpSystems,
  placeholder = 'Select ERP system...',
  excludeId,
  testID = 'erp-combobox',
}: ERPComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedERP = useMemo(
    () => erpSystems.find((erp) => erp.id === value) ?? null,
    [erpSystems, value],
  );

  const filteredSystems = useMemo(() => {
    return erpSystems.filter((erp) => {
      if (excludeId !== undefined && erp.id === excludeId) return false;
      if (searchQuery.length >= 1) {
        const query = searchQuery.toLowerCase();
        return (
          erp.name.toLowerCase().includes(query) ||
          erp.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [erpSystems, excludeId, searchQuery]);

  const handleSelect = useCallback(
    (erpId: string) => {
      onSelect(erpId);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelect],
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  const triggerLabel = selectedERP?.name ?? placeholder;
  const hasValue = selectedERP !== null;

  if (isWeb) {
    return (
      <View className="relative" testID={testID}>
        <TriggerButton
          label={triggerLabel}
          hasValue={hasValue}
          onPress={handleToggle}
          testID={`${testID}-trigger`}
        />
        {isOpen && (
          <WebDropdown
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            items={filteredSystems}
            selectedId={value}
            onSelect={handleSelect}
            onClose={handleClose}
            testID={testID}
          />
        )}
      </View>
    );
  }

  return (
    <View testID={testID}>
      <TriggerButton
        label={triggerLabel}
        hasValue={hasValue}
        onPress={handleToggle}
        testID={`${testID}-trigger`}
      />
      <NativeModal
        isVisible={isOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        items={filteredSystems}
        selectedId={value}
        onSelect={handleSelect}
        onClose={handleClose}
        testID={testID}
      />
    </View>
  );
};

interface TriggerButtonProps {
  label: string;
  hasValue: boolean;
  onPress: () => void;
  testID: string;
}

const TriggerButton = ({ label, hasValue, onPress, testID }: TriggerButtonProps) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
    accessibilityRole="button"
    accessibilityLabel={hasValue ? `ERP system: ${label}` : label}
    testID={testID}
  >
    <Text
      className={`font-body text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}
      style={{ fontFamily: 'Inter' }}
    >
      {label}
    </Text>
    <ChevronDown size={18} color={colors.mutedForeground} />
  </Pressable>
);
