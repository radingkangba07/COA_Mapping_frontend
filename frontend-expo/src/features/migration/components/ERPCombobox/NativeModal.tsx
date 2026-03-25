import React, { useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { ERPOptionItem } from './ERPOptionItem';
import type { ERPItem } from './types';

interface NativeModalProps {
  isVisible: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  items: ERPItem[];
  selectedId: string | null;
  onSelect: (erpId: string) => void;
  onClose: () => void;
  testID: string;
}

export const NativeModal = ({
  isVisible,
  searchQuery,
  onSearchChange,
  items,
  selectedId,
  onSelect,
  onClose,
  testID,
}: NativeModalProps) => {
  const renderItem = useCallback(
    ({ item }: { item: ERPItem }) => (
      <ERPOptionItem
        erpId={item.id}
        erpName={item.name}
        fieldCount={item.fields?.length ?? 0}
        isSelected={item.id === selectedId}
        onSelect={onSelect}
        testID={`${testID}-option-${item.id}`}
      />
    ),
    [selectedId, onSelect, testID],
  );

  const keyExtractor = useCallback((item: ERPItem) => item.id, []);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text
            className="font-body text-lg font-semibold text-foreground"
            style={{ fontFamily: 'Inter' }}
          >
            Select ERP System
          </Text>
          <Pressable onPress={onClose} hitSlop={8} testID={`${testID}-close`}>
            <X size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <View className="flex-row items-center border-b border-muted px-4">
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search ERP systems..."
            placeholderTextColor={colors.mutedForeground}
            className="flex-1 px-2 py-3 font-body text-sm text-foreground"
            style={{ fontFamily: 'Inter' }}
            autoFocus
            testID={`${testID}-search`}
          />
        </View>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerClassName="pb-8"
          ListEmptyComponent={
            <View className="px-4 py-8">
              <Text
                className="text-center font-body text-sm text-muted-foreground"
                style={{ fontFamily: 'Inter' }}
              >
                No ERP systems found
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};
