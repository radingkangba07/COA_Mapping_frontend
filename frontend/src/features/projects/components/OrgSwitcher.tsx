import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  type LayoutRectangle,
  type ListRenderItemInfo,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Select } from '@/shared/components/ui/Select';
import type { SelectOption } from '@/shared/components/ui/Select';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { useOrgsViewModel } from '../hooks/useOrgsViewModel';
import { createOrgId } from '@/shared/types/common.types';
import type { Org } from '../types/org.types';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';

// ─── Constants ──────────────────────────────────────────────────────────────

const POPOVER_GAP = 4;
const POPOVER_WIDTH = 220;
const POPOVER_MAX_HEIGHT = 240;
const BOTTOM_SHEET_MAX_HEIGHT = '50%';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrgSwitcherProps {
  collapsed?: boolean;
  className?: string;
  testID?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OrgSwitcher({
  collapsed = false,
  className,
  testID = 'org-switcher',
}: OrgSwitcherProps): React.JSX.Element | null {
  const { orgs, activeOrg, activeOrgId, isLoading, setActiveOrg } = useOrgsViewModel();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);

  const handleChange = useCallback(
    (orgId: string) => {
      setActiveOrg(createOrgId(orgId));
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsOpen(false);
    },
    [setActiveOrg, queryClient],
  );

  const handleBadgePress = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const options: SelectOption[] = useMemo(
    () => orgs.map((org) => ({ label: org.name, value: org.id })),
    [orgs],
  );

  const badgeInitial = activeOrg?.name.charAt(0).toUpperCase() ?? '?';

  const renderPopoverItem = useCallback(
    ({ item }: ListRenderItemInfo<Org>) => {
      const isSelected = item.id === activeOrgId;
      return (
        <Pressable
          className={cn(
            'flex-row items-center justify-between px-3 py-2.5',
            isSelected && 'bg-accent/10',
          )}
          onPress={() => handleChange(item.id)}
          testID={`${testID}-popover-option-${item.id}`}
        >
          <Text
            className={cn(
              'font-body text-sm',
              isSelected ? 'font-medium text-accent' : 'text-foreground',
            )}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isSelected && <Check size={16} color={colors.accent} />}
        </Pressable>
      );
    },
    [activeOrgId, handleChange, testID],
  );

  const keyExtractor = useCallback((item: Org) => item.id, []);

  if (isLoading) {
    return (
      <View className={cn('justify-center', className)} testID={`${testID}-skeleton`}>
        {collapsed ? (
          <Skeleton width={40} height={40} borderRadius={9999} />
        ) : (
          <Skeleton width="100%" height={40} borderRadius={8} />
        )}
      </View>
    );
  }

  if (orgs.length === 0) {
    return null;
  }

  if (!collapsed) {
    return (
      <View className={className} testID={testID}>
        <Select
          options={options}
          value={activeOrgId ?? undefined}
          onValueChange={handleChange}
          placeholder="Select organization"
          testID={`${testID}-select`}
        />
      </View>
    );
  }

  return (
    <View className={className} testID={testID}>
      <Pressable
        ref={triggerRef}
        onPress={handleBadgePress}
        className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        testID={`${testID}-badge`}
      >
        <Text className="font-heading text-base font-semibold text-primary-foreground">
          {badgeInitial}
        </Text>
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
                    top: triggerLayout.y + triggerLayout.height + POPOVER_GAP,
                    left: triggerLayout.x,
                    width: POPOVER_WIDTH,
                    maxHeight: POPOVER_MAX_HEIGHT,
                  }
                : isWeb
                  ? { maxHeight: POPOVER_MAX_HEIGHT }
                  : { maxHeight: BOTTOM_SHEET_MAX_HEIGHT }
            }
            onStartShouldSetResponder={() => true}
          >
            {!isWeb && (
              <View className="items-center py-3">
                <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </View>
            )}
            <FlatList
              data={orgs}
              keyExtractor={keyExtractor}
              renderItem={renderPopoverItem}
              bounces={false}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
