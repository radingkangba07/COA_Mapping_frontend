import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  type LayoutRectangle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { isWeb } from '@/shared/utils/platform.utils';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';
import {
  PROJECT_PERMISSIONS,
  type ProjectPermission,
} from '../types/project-access.types';

const PILL_BG: Record<ProjectPermission, string> = {
  viewer: 'bg-secondary',
  editor: 'bg-accent',
  approver: 'bg-warning',
  admin: 'bg-success',
  owner: 'bg-primary',
};

const PILL_TEXT: Record<ProjectPermission, string> = {
  viewer: 'text-secondary-foreground',
  editor: 'text-accent-foreground',
  approver: 'text-warning-foreground',
  admin: 'text-success-foreground',
  owner: 'text-primary-foreground',
};

const PILL_ICON: Record<ProjectPermission, string> = {
  viewer: '#18181B',
  editor: '#FFFFFF',
  approver: '#FFFFFF',
  admin: '#FFFFFF',
  owner: '#FFFFFF',
};

const MENU_WIDTH = 132;

interface RolePillOption {
  readonly value: ProjectPermission;
  readonly label: string;
}

interface RolePillSelectorProps {
  readonly value: ProjectPermission;
  readonly onChange: (next: ProjectPermission) => void;
  readonly options?: readonly RolePillOption[];
  readonly disabled?: boolean;
  readonly isLoading?: boolean;
  readonly testID?: string;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function RolePillSelector({
  value,
  onChange,
  options,
  disabled = false,
  isLoading = false,
  testID,
}: RolePillSelectorProps): React.JSX.Element {
  const resolvedOptions: readonly RolePillOption[] =
    options ??
    PROJECT_PERMISSIONS.map((permission) => ({
      value: permission,
      label: capitalize(permission),
    }));

  const activeLabel =
    resolvedOptions.find((option) => option.value === value)?.label ??
    capitalize(value);
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  const handleOpen = useCallback((): void => {
    if (disabled || isLoading) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setLayout({ x, y, width, height });
      setIsOpen(true);
    });
  }, [disabled, isLoading]);

  const handleSelect = useCallback(
    (next: ProjectPermission): void => {
      setIsOpen(false);
      if (next !== value) onChange(next);
    },
    [onChange, value],
  );

  const handleClose = useCallback((): void => setIsOpen(false), []);

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
        disabled={disabled || isLoading}
        accessibilityRole="button"
        accessibilityLabel={`Permission: ${activeLabel}. Tap to change.`}
        className={cn(
          'flex-row items-center gap-1 rounded-full px-2.5 py-1',
          PILL_BG[value],
          (disabled || isLoading) && 'opacity-60',
        )}
        testID={testID}
      >
        <Text className={cn('text-xs font-semibold', PILL_TEXT[value])}>
          {activeLabel}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={PILL_ICON[value]} />
        ) : (
          <ChevronDown size={12} color={PILL_ICON[value]} />
        )}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType={isWeb ? 'none' : 'fade'}
        onRequestClose={handleClose}
      >
        <Pressable
          className={cn('flex-1', isWeb ? 'bg-transparent' : 'bg-black/30')}
          onPress={handleClose}
        >
          <View
            className="absolute overflow-hidden rounded-md border border-border bg-background py-1 shadow-lg"
            style={
              layout !== null
                ? {
                    top: layout.y + layout.height + 4,
                    left: Math.max(8, layout.x + layout.width - MENU_WIDTH),
                    width: MENU_WIDTH,
                  }
                : undefined
            }
            onStartShouldSetResponder={() => true}
          >
            {resolvedOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  className={cn(
                    'flex-row items-center justify-between px-3 py-2',
                    isSelected && 'bg-accent/10',
                  )}
                  testID={
                    testID !== undefined
                      ? `${testID}-option-${option.value}`
                      : undefined
                  }
                >
                  <Text
                    className={cn(
                      'font-body text-sm',
                      isSelected ? 'font-medium text-accent' : 'text-foreground',
                    )}
                  >
                    {option.label}
                  </Text>
                  {isSelected ? <Check size={14} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
