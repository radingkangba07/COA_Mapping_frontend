import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, Pressable, useWindowDimensions, Modal,
  type LayoutRectangle,
} from 'react-native';
import { LogOut } from 'lucide-react-native';
import { BREAKPOINTS } from '@/shared/utils/platform.utils';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useAppStore } from '@/shared/store/app.store';
import { colors } from '@/config/theme';
import { AppTabs } from './tabs/AppTabs';
import { AppDrawer } from './drawers/AppDrawer';

// ─── Profile Dropdown ─────────────────────────────────────────────────────

const POPOVER_GAP = 4;

interface ProfileDropdownProps {
  name: string;
  email: string;
  onLogout: () => void;
}

function ProfileDropdown({ name, email, onLogout }: ProfileDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);

  const initial = name.charAt(0).toUpperCase();

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    setIsOpen(false);
    onLogout();
  }, [onLogout]);

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.primary }}
        hitSlop={4}
        testID="topbar-profile-button"
      >
        <Text className="font-heading text-xs font-semibold" style={{ color: colors.primaryForeground }}>
          {initial}
        </Text>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <Pressable
          className="flex-1 bg-transparent"
          onPress={handleClose}
        >
          <View
            className="absolute overflow-hidden rounded-lg border shadow-lg"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.card,
              ...(triggerLayout !== null
                ? {
                    top: triggerLayout.y + triggerLayout.height + POPOVER_GAP,
                    right: 16,
                    minWidth: 200,
                  }
                : {}),
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* User info */}
            <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View className="flex-row items-center gap-2.5">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="font-heading text-sm font-semibold" style={{ color: colors.primaryForeground }}>
                    {initial}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="font-body text-sm font-medium"
                    style={{ color: colors.foreground }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text
                    className="font-body text-xs"
                    style={{ color: colors.mutedForeground }}
                    numberOfLines={1}
                  >
                    {email}
                  </Text>
                </View>
              </View>
            </View>

            {/* Logout */}
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center gap-2.5 px-4 py-2.5"
              // @ts-expect-error -- web-only hover style
              style={({ hovered }: { hovered?: boolean }) => ({
                backgroundColor: hovered === true ? colors.muted : 'transparent',
              })}
              testID="topbar-logout-button"
            >
              <LogOut size={14} color={colors.destructive} />
              <Text className="font-body text-sm" style={{ color: colors.destructive }}>
                Logout
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────

const AppTopBar = (): React.JSX.Element => {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  useAppStore((s) => s.theme);

  const handleLogout = useCallback((): void => {
    void logout();
  }, [logout]);

  return (
    <View
      className="h-12 flex-row items-center justify-between border-b border-border px-5"
      style={{ backgroundColor: colors.surface }}
    >
      <Text className="font-heading text-sm font-bold" style={{ color: colors.foreground }}>
        COA Migration
      </Text>
      <ProfileDropdown
        name={user?.name ?? 'User'}
        email={user?.email ?? ''}
        onLogout={handleLogout}
      />
    </View>
  );
};

export const ResponsiveAppNavigator = (): React.JSX.Element => {
  const { width } = useWindowDimensions();

  if (width < BREAKPOINTS.md) {
    return <AppTabs />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AppTopBar />
      <View style={{ flex: 1 }}>
        <AppDrawer />
      </View>
    </View>
  );
};
