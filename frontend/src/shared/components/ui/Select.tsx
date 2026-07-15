import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  type LayoutRectangle,
  type ListRenderItemInfo,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
  testID?: string;
  searchable?: boolean;
}

export const Select = React.forwardRef<View, SelectProps>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = 'Select an option',
      disabled = false,
      error,
      label,
      className,
      testID,
      searchable = false,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
    const triggerRef = useRef<View>(null);

    const hasError = error !== undefined && error.length > 0;
    const selectedOption = options.find((opt) => opt.value === value);

    const handleOpen = useCallback(() => {
      if (disabled) return;
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setTriggerLayout({ x, y, width, height });
        setIsOpen(true);
      });
    }, [disabled]);

    const handleSelect = useCallback(
      (optionValue: string) => {
        onValueChange(optionValue);
        setIsOpen(false);
      },
      [onValueChange],
    );

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setSearch('');
    }, []);

    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<SelectOption>) => {
        const isSelected = item.value === value;
        const isDisabled = item.disabled === true;
        return (
          <Pressable
            className={cn(
              'flex-row items-center justify-between px-3 py-2.5',
              isSelected && 'bg-accent/10',
              isDisabled && 'opacity-40',
            )}
            onPress={isDisabled ? undefined : () => handleSelect(item.value)}
            testID={testID !== undefined ? `${testID}-option-${item.value}` : undefined}
          >
            <Text
              className={cn(
                'font-body text-sm',
                isSelected ? 'font-medium text-accent' : 'text-foreground',
              )}
            >
              {item.label}
            </Text>
            {isSelected && <Check size={16} color={colors.accent} />}
          </Pressable>
        );
      },
      [value, handleSelect, testID],
    );

    const keyExtractor = useCallback((item: SelectOption) => item.value, []);

    const filteredOptions = searchable && search.length > 0
      ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : options;

    return (
      <View className={cn('gap-1.5', className)} testID={testID} ref={ref}>
        {label !== undefined && label.length > 0 && (
          <Text className="font-body text-sm font-medium text-foreground">
            {label}
          </Text>
        )}

        <Pressable
          ref={triggerRef}
          onPress={handleOpen}
          disabled={disabled}
          className={cn(
            'h-10 flex-row items-center justify-between rounded-md border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
            hasError ? 'border-destructive' : 'border-input',
            disabled && 'opacity-50',
          )}
          testID={testID !== undefined ? `${testID}-trigger` : undefined}
        >
          <Text
            className={cn(
              'font-body text-sm',
              selectedOption !== undefined && !disabled
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
            numberOfLines={1}
          >
            {selectedOption !== undefined ? selectedOption.label : placeholder}
          </Text>
          <ChevronDown size={16} color={colors.mutedForeground} />
        </Pressable>

        <Modal
          visible={isOpen}
          transparent
          animationType={isWeb ? 'none' : 'slide'}
          onRequestClose={handleClose}
        >
          <Pressable
            className={cn('flex-1', isWeb ? 'bg-transparent' : 'bg-black/40')}
            onPress={handleClose}
          >
            <View
              className={cn(
                'overflow-hidden rounded-md border border-border bg-background shadow-lg',
                isWeb ? 'absolute' : 'absolute bottom-0 left-0 right-0 rounded-t-xl pb-8',
              )}
              style={
                isWeb && triggerLayout !== null
                  ? {
                      top: triggerLayout.y + triggerLayout.height + 4,
                      left: triggerLayout.x,
                      width: triggerLayout.width,
                      maxHeight: 240,
                    }
                  : isWeb
                    ? { maxHeight: 240 }
                    : { maxHeight: '50%' }
              }
              onStartShouldSetResponder={() => true}
            >
              {!isWeb && (
                <View className="items-center py-3">
                  <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </View>
              )}
              {searchable && (
                <View className="border-b border-border px-3 py-2">
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search..."
                    placeholderTextColor={colors.mutedForeground}
                    autoFocus
                    className="font-body text-sm text-foreground"
                    testID={testID !== undefined ? `${testID}-search` : undefined}
                  />
                </View>
              )}
              <FlatList
                data={filteredOptions}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                bounces={false}
              />
            </View>
          </Pressable>
        </Modal>

        {hasError && (
          <Text className="text-xs text-destructive">{error}</Text>
        )}
      </View>
    );
  },
);

Select.displayName = 'Select';
