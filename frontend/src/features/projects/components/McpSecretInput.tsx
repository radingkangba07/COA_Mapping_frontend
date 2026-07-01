import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Input } from '@/shared/components/ui/Input';
import { colors } from '@/config/theme';

const TOGGLE_ICON_SIZE = 18;

interface McpSecretInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  secretLabel?: string;
  testID?: string;
}

export const McpSecretInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secretLabel = 'value',
  testID,
}: McpSecretInputProps): React.JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);

  const handleToggle = useCallback((): void => {
    setIsVisible((prev) => !prev);
  }, []);

  const accessibilityLabel = isVisible
    ? `Hide ${secretLabel}`
    : `Show ${secretLabel}`;

  return (
    <View className="relative justify-center">
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={error}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        inputClassName="pr-10"
        testID={testID}
      />
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        className="absolute right-3 bottom-2.5"
        testID={testID !== undefined ? `${testID}-toggle` : undefined}
      >
        {isVisible ? (
          <EyeOff size={TOGGLE_ICON_SIZE} color={colors.mutedForeground} />
        ) : (
          <Eye size={TOGGLE_ICON_SIZE} color={colors.mutedForeground} />
        )}
      </Pressable>
    </View>
  );
};
