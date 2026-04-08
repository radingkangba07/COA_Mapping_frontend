import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

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
    const [hovered, setHovered] = useState(false);
    const handlePress = useCallback(() => {
      onSelect(erpId);
    }, [onSelect, erpId]);

    const bg = isSelected
      ? 'rgba(0,51,153,0.08)'
      : hovered
        ? 'rgba(0,51,153,0.04)'
        : 'transparent';

    return (
      <Pressable
        onPress={handlePress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        className="flex-row items-center justify-between px-4 py-3"
        style={{ backgroundColor: bg, cursor: 'pointer' } as Record<string, unknown>}
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
        {isSelected && <Check size={18} color="#003399" />}
      </Pressable>
    );
  },
);
