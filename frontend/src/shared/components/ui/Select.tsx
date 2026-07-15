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
  /** Renders a type-to-search input inside the dropdown modal instead of a plain list. */
  combobox?: boolean;
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
      combobox = false,
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
        setSearch('');
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

    const showSearch = combobox || searchable;
    const filteredOptions =
      showSearch && search.length > 0
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    const dropdownStyle =
      isWeb && triggerLayout !== null
        ? {
            top: triggerLayout.y + triggerLayout.height + 4,
            left: triggerLayout.x,
            width: triggerLayout.width,
            maxHeight: 280,
          }
        : isWeb
          ? { maxHeight: 280 }
          : { maxHeight: '50%' as const };

    return (
      <View className={cn('gap-1.5', className)} testID={testID} ref={ref}>
        {label !== undefined && label.length > 0 && (
          <Text className="font-body text-sm font-medium text-foreground">
            {label}
          </Text>
        )}

        {/* ── Trigger ────────────────────────────────────────────────────── */}
        <Pressable
          ref={triggerRef}
          onPress={handleOpen}
          disabled={disabled}
          className={cn(
            'h-10 flex-row items-center justify-between rounded-md border bg-background px-3',
            hasError ? 'border-destructive' : 'border-input',
            disabled && 'opacity-50',
          )}
          testID={testID !== undefined ? `${testID}-trigger` : undefined}
        >
          <Text
            className={cn(
              'font-body text-sm flex-1',
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

        {/* ── Dropdown modal ─────────────────────────────────────────────── */}
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
                isWeb
                  ? 'absolute'
                  : 'absolute bottom-0 left-0 right-0 rounded-t-xl pb-8',
              )}
              style={dropdownStyle}
              onStartShouldSetResponder={() => true}
            >
              {!isWeb && (
                <View className="items-center py-3">
                  <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </View>
              )}

              {/* Search input — shown for both combobox and searchable modes */}
              {showSearch && (
                <View className="border-b border-border px-3 py-3">
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Type to search…"
                    placeholderTextColor={colors.mutedForeground}
                    autoFocus
                    className="font-body text-sm text-foreground h-9"
                    testID={testID !== undefined ? `${testID}-search` : undefined}
                  />
                </View>
              )}

              <FlatList
                data={filteredOptions}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                bounces={false}
                keyboardShouldPersistTaps="always"
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
