import React, { useCallback } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { BREAKPOINTS } from '@/shared/utils/platform.utils';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { AppTabs } from './tabs/AppTabs';
import { AppDrawer } from './drawers/AppDrawer';

const TOPBAR_BG = '#111111';

const AppTopBar = (): React.JSX.Element => {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = useCallback((): void => {
    void logout();
  }, [logout]);

  return (
    <View
      className="h-12 flex-row items-center justify-between px-5"
      style={{ backgroundColor: TOPBAR_BG }}
    >
      <Text className="font-heading text-sm font-bold text-white">
        COA Migration
      </Text>
      <Pressable
        onPress={handleLogout}
        className="flex-row items-center gap-2 rounded-md px-3 py-1.5"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        hitSlop={4}
        testID="topbar-logout-button"
      >
        <LogOut size={14} color="#FFFFFF" />
        <Text className="text-xs font-medium text-white">Logout</Text>
      </Pressable>
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
