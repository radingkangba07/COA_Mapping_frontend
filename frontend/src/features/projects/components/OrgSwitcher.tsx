import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  type LayoutRectangle,
} from 'react-native';
import { Check, Search } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { useOrgsViewModel } from '../hooks/useOrgsViewModel';
import { createOrgId } from '@/shared/types/common.types';
import type { Org } from '../types/org.types';
import { cn } from '@/shared/utils/string.utils';
import { isWeb } from '@/shared/utils/platform.utils';
import { colors } from '@/config/theme';

// ─── Constants ──────────────────────────────────────────────────────────────

const POPOVER_GAP = 4;
const POPOVER_WIDTH = 240;
const POPOVER_MAX_HEIGHT = 360;
const BOTTOM_SHEET_MAX_HEIGHT = '65%';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrgSwitcherProps {
  collapsed?: boolean;
  className?: string;
  testID?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <View className="px-4 pt-3 pb-1.5">
      <Text className="font-body text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

interface OrgItemProps {
  org: Org;
  isSelected: boolean;
  onPress: (id: string) => void;
  testID?: string;
}

function OrgItem({ org, isSelected, onPress, testID }: OrgItemProps): React.JSX.Element {
  return (
    <Pressable
      className={cn('flex-row items-center justify-between px-4 py-2.5')}
      onPress={() => onPress(org.id)}
      testID={testID}
    >
      <Text
        className={cn(
          'font-body text-sm flex-1 mr-2',
          isSelected ? 'font-semibold text-accent' : 'text-foreground',
        )}
        numberOfLines={1}
      >
        {org.name}
      </Text>
      {isSelected && <Check size={16} color={colors.accent} />}
    </Pressable>
  );
}

// ─── Dropdown content ────────────────────────────────────────────────────────

interface DropdownContentProps {
  employerOrgs: Org[];
  clientOrgs: Org[];
  activeOrgId: string | null;
  onSelect: (id: string) => void;
  testID: string;
}

function DropdownContent({
  employerOrgs,
  clientOrgs,
  activeOrgId,
  onSelect,
  testID,
}: DropdownContentProps): React.JSX.Element {
  const [query, setQuery] = useState('');

  const filteredEmployer = useMemo(() => {
    if (query.trim() === '') return employerOrgs;
    const q = query.toLowerCase();
    return employerOrgs.filter((o) => o.name.toLowerCase().includes(q));
  }, [employerOrgs, query]);

  const filteredClient = useMemo(() => {
    if (query.trim() === '') return clientOrgs;
    const q = query.toLowerCase();
    return clientOrgs.filter((o) => o.name.toLowerCase().includes(q));
  }, [clientOrgs, query]);

  const hasResults = filteredEmployer.length > 0 || filteredClient.length > 0;
  const hasGroups = clientOrgs.length > 0;

  return (
    <>
      {/* Search input */}
      <View className="flex-row items-center border-b border-border px-3 py-2 gap-2">
        <Search size={14} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search workspaces..."
          placeholderTextColor={colors.mutedForeground}
          className="flex-1 font-body text-sm text-foreground h-7 focus:outline-none"
          autoCorrect={false}
          autoCapitalize="none"
          testID={`${testID}-search`}
        />
      </View>

      {/* List */}
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
        {!hasGroups ? (
          // Flat list — no client orgs
          filteredEmployer.map((org) => (
            <OrgItem
              key={org.id}
              org={org}
              isSelected={org.id === activeOrgId}
              onPress={onSelect}
              testID={`${testID}-option-${org.id}`}
            />
          ))
        ) : (
          <>
            {filteredEmployer.length > 0 && (
              <>
                <SectionHeader label="Your Workspace" />
                {filteredEmployer.map((org) => (
                  <OrgItem
                    key={org.id}
                    org={org}
                    isSelected={org.id === activeOrgId}
                    onPress={onSelect}
                    testID={`${testID}-option-${org.id}`}
                  />
                ))}
              </>
            )}
            {filteredClient.length > 0 && (
              <>
                <SectionHeader label="Client Workspaces" />
                {filteredClient.map((org) => (
                  <OrgItem
                    key={org.id}
                    org={org}
                    isSelected={org.id === activeOrgId}
                    onPress={onSelect}
                    testID={`${testID}-option-${org.id}`}
                  />
                ))}
              </>
            )}
          </>
        )}

        {!hasResults && (
          <View className="px-4 py-4">
            <Text className="font-body text-sm text-muted-foreground">No workspaces found</Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OrgSwitcher({
  collapsed = false,
  className,
  testID = 'org-switcher',
}: OrgSwitcherProps): React.JSX.Element | null {
  const { orgs, employerOrgs, clientOrgs, activeOrg, activeOrgId, isLoading, setActiveOrg } =
    useOrgsViewModel();
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

  const handleTriggerPress = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const badgeInitial = activeOrg?.name.charAt(0).toUpperCase() ?? '?';

  const popoverStyle = useMemo(() => {
    if (!isWeb) return { maxHeight: BOTTOM_SHEET_MAX_HEIGHT as `${number}%` };
    if (triggerLayout !== null) {
      return {
        top: triggerLayout.y + triggerLayout.height + POPOVER_GAP,
        left: triggerLayout.x,
        width: collapsed ? POPOVER_WIDTH : triggerLayout.width,
        maxHeight: POPOVER_MAX_HEIGHT,
      };
    }
    return { maxHeight: POPOVER_MAX_HEIGHT };
  }, [triggerLayout, collapsed]);

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

  if (orgs.length === 0) return null;

  const trigger = collapsed ? (
    <Pressable
      ref={triggerRef}
      onPress={handleTriggerPress}
      className="h-10 w-10 items-center justify-center rounded-full bg-primary"
      testID={`${testID}-badge`}
    >
      <Text className="font-heading text-base font-semibold text-primary-foreground">
        {badgeInitial}
      </Text>
    </Pressable>
  ) : (
    <Pressable
      ref={triggerRef}
      onPress={handleTriggerPress}
      className="h-10 flex-row items-center justify-between rounded-md border border-input bg-background px-3"
      testID={`${testID}-trigger`}
    >
      <Text className="font-body text-sm text-foreground flex-1 mr-2" numberOfLines={1}>
        {activeOrg?.name ?? 'Select workspace'}
      </Text>
      <Search size={14} color={colors.mutedForeground} />
    </Pressable>
  );

  return (
    <View className={className} testID={testID}>
      {trigger}

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
              !isWeb && 'absolute bottom-0 left-0 right-0 rounded-t-xl pb-8',
              isWeb && 'absolute',
            )}
            style={popoverStyle}
            onStartShouldSetResponder={() => true}
          >
            {!isWeb && (
              <View className="items-center py-3">
                <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </View>
            )}
            <DropdownContent
              employerOrgs={employerOrgs}
              clientOrgs={clientOrgs}
              activeOrgId={activeOrgId}
              onSelect={handleChange}
              testID={testID}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
