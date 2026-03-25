import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { ERPOptionItem } from './ERPOptionItem';
import type { ERPItem } from './types';

interface WebDropdownProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  items: ERPItem[];
  selectedId: string | null;
  onSelect: (erpId: string) => void;
  onClose: () => void;
  testID: string;
}

export const WebDropdown = ({
  searchQuery,
  onSearchChange,
  items,
  selectedId,
  onSelect,
  onClose,
  testID,
}: WebDropdownProps) => (
  <>
    <Pressable
      onPress={onClose}
      className="fixed inset-0"
      style={{ zIndex: 49 }}
      testID={`${testID}-backdrop`}
    />
    <View
      className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-border bg-background shadow-lg"
      style={{ zIndex: 50 }}
    >
      <View className="flex-row items-center border-b border-muted px-3">
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search ERP systems..."
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 px-2 py-2.5 font-body text-sm text-foreground"
          // Web-only: outlineStyle is not in RN types but needed to remove focus outline on web
          style={{ fontFamily: 'Inter', outlineStyle: 'none' } as Record<string, unknown>}
          autoFocus
          testID={`${testID}-search`}
        />
      </View>
      <ScrollView className="max-h-56">
        {items.length === 0 ? (
          <View className="px-3 py-4">
            <Text
              className="text-center font-body text-sm text-muted-foreground"
              style={{ fontFamily: 'Inter' }}
            >
              No ERP systems found
            </Text>
          </View>
        ) : (
          items.map((erp) => (
            <ERPOptionItem
              key={erp.id}
              erpId={erp.id}
              erpName={erp.name}
              fieldCount={erp.fields?.length ?? 0}
              isSelected={erp.id === selectedId}
              onSelect={onSelect}
              testID={`${testID}-option-${erp.id}`}
            />
          ))
        )}
      </ScrollView>
    </View>
  </>
);
