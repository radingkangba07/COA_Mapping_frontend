import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';

interface ERPOptionItemProps {
  erpId: string;
  erpName: string;
  fieldCount: number;
  isSelected: boolean;
  onSelect: (erpId: string) => void;
  testID: string;
}

export const ERPOptionItem = React.memo(
  ({ erpId, erpName, fieldCount, isSelected, onSelect, testID }: ERPOptionItemProps) => {
    const handlePress = useCallback(() => {
      onSelect(erpId);
    }, [onSelect, erpId]);

    return (
      <Pressable
        onPress={handlePress}
        className={`flex-row items-center justify-between px-4 py-3 ${
          isSelected ? 'bg-accent' : ''
        }`}
        testID={testID}
      >
        <View className="flex-1">
          <Text
            className="font-body text-sm font-medium text-foreground"
            style={{ fontFamily: 'Inter' }}
          >
            {erpName}
          </Text>
          {fieldCount > 0 && (
            <Text
              className="font-body text-xs text-muted-foreground"
              style={{ fontFamily: 'Inter' }}
            >
              {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
            </Text>
          )}
        </View>
        {isSelected && <Check size={18} color={colors.accent} />}
      </Pressable>
    );
  },
);
