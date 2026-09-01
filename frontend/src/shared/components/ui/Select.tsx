import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Dimensions,
  type LayoutRectangle,
  type ListRenderItemInfo,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';
import { Tooltip } from './Tooltip';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Optional native-tooltip-equivalent hover text for this row — see `Tooltip`. */
  tip?: string;
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
  /** Additive override for the trigger button itself (background, radius,
   *  height, padding) — `className` above only reaches the outer wrapper. */
  triggerClassName?: string;
  /** Additive override for the trigger's own label Text (font size/weight)
   *  — `triggerClassName` reaches the trigger `Pressable`, not this inner
   *  `Text`, which otherwise stays fixed at this component's default. */
  triggerTextClassName?: string;
  /** Replaces the trigger's default `Text` + `ChevronDown` content entirely
   *  — for a caller whose reference design needs bespoke trigger content
   *  (e.g. a separately-styled count, a boxed chevron) that no className
   *  override can produce. The Pressable itself (press handling, ref,
   *  measurement, disabled state) is unchanged; only what renders inside
   *  it differs. Receives the currently selected option, if any. */
  renderTrigger?: (selectedOption: SelectOption | undefined) => React.ReactNode;
  /** Replaces one dropdown-list row's inner content (same additive
   *  reasoning as `renderTrigger`) — the row's own `Pressable` (press
   *  handling, selected/disabled state, testID) is unchanged. */
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  testID?: string;
  searchable?: boolean;
  /** Renders a type-to-search input inside the dropdown modal instead of a plain list. */
  combobox?: boolean;
  /** Overrides the dropdown panel's width — defaults to matching the trigger's own width. */
  dropdownWidth?: number;
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
      triggerClassName,
      triggerTextClassName,
      renderTrigger,
      renderOption,
      testID,
      searchable = false,
      combobox = false,
      dropdownWidth,
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
        // Only FieldFilterDropdown supplies `renderOption` today (the
        // sole consumer of it app-wide) — its reference shows selection
        // via a trailing checkmark only, with a per-row hover and
        // rounded corners neither the default row rendering nor any
        // other Select consumer has asked for. Scoping these to
        // `renderOption`'s presence keeps every other consumer's
        // default row (accent-tinted background, no hover/radius)
        // completely unchanged.
        const hasCustomOption = renderOption !== undefined;
        const onSelect = isDisabled ? undefined : () => handleSelect(item.value);
        const content = renderOption ? (
          renderOption(item, isSelected)
        ) : (
          <>
            <Text
              className={cn(
                'font-body text-sm',
                isSelected ? 'font-medium text-accent' : 'text-foreground',
              )}
            >
              {item.label}
            </Text>
            {isSelected && <Check size={16} color={colors.accent} />}
          </>
        );
        return (
          <Pressable
            className={cn(
              'flex-row items-center justify-between px-3 py-2.5',
              hasCustomOption ? 'rounded-[7px] hover:bg-surface' : isSelected && 'bg-accent/10',
              isDisabled && 'opacity-40',
            )}
            onPress={onSelect}
            testID={testID !== undefined ? `${testID}-option-${item.value}` : undefined}
          >
            {item.tip !== undefined && item.tip.length > 0 ? (
              // Native-tooltip-equivalent hover text — `onPress` passthrough
              // needed because `Tooltip`'s own inner `Pressable` would
              // otherwise swallow the click before it reaches this row's
              // outer `Pressable` (react-native-web's own responder
              // handling, not a bug in either component).
              <Tooltip content={item.tip} position="bottom" className="flex-1" onPress={onSelect}>
                {content}
              </Tooltip>
            ) : (
              content
            )}
          </Pressable>
        );
      },
      [value, handleSelect, testID, renderOption],
    );

    const keyExtractor = useCallback((item: SelectOption) => item.value, []);

    const showSearch = combobox || searchable;
    const filteredOptions =
      showSearch && search.length > 0
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options;

    let dropdownStyle;
    if (isWeb && triggerLayout !== null) {
      // Flip above the trigger when the viewport space below is too small,
      // and clamp the height to the available space so the panel never
      // renders (unscrollably) past the edge of the screen.
      const windowHeight = Dimensions.get('window').height;
      const spaceBelow = windowHeight - (triggerLayout.y + triggerLayout.height) - 12;
      const spaceAbove = triggerLayout.y - 12;
      const shouldFlipUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(Math.min(320, shouldFlipUp ? spaceAbove : spaceBelow), 100);
      dropdownStyle = {
        left: triggerLayout.x,
        width: dropdownWidth ?? triggerLayout.width,
        maxHeight,
        ...(shouldFlipUp
          ? { bottom: windowHeight - triggerLayout.y + 4 }
          : { top: triggerLayout.y + triggerLayout.height + 4 }),
      };
    } else {
      dropdownStyle = isWeb ? { maxHeight: 320 } : { maxHeight: '50%' as const };
    }

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
            triggerClassName,
          )}
          testID={testID !== undefined ? `${testID}-trigger` : undefined}
        >
          {renderTrigger ? (
            renderTrigger(selectedOption)
          ) : (
            <>
              <Text
                className={cn(
                  'font-body text-sm flex-1',
                  selectedOption !== undefined && !disabled
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                  triggerTextClassName,
                )}
                numberOfLines={1}
              >
                {selectedOption !== undefined ? selectedOption.label : placeholder}
              </Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </>
          )}
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
                'overflow-hidden rounded-[10px] border border-border bg-card p-1.5',
                isWeb
                  ? 'absolute'
                  : 'absolute bottom-0 left-0 right-0 rounded-t-xl pb-8',
              )}
              // Reference: `box-shadow:0 14px 38px rgba(0,0,0,.18)` —
              // Tailwind's `shadow-lg` preset is a tighter/lighter recipe.
              style={[dropdownStyle, isWeb ? { boxShadow: '0 14px 38px rgba(0,0,0,.18)' } : undefined]}
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
