import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {
  FolderOpen,
  ArrowRightLeft,
  Settings,
  LogOut,
} from 'lucide-react-native';
import { colors } from '@/config/theme';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProjectsStack } from '../stacks/ProjectsStack';
import { MigrationStack } from '../stacks/MigrationStack';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { AppDrawerParamList } from '../types';

const Drawer = createDrawerNavigator<AppDrawerParamList>();

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
}

const NavItem = ({
  label,
  icon,
  isActive,
  onPress,
}: NavItemProps): React.JSX.Element => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center rounded-lg px-3 py-3 ${
      isActive ? 'bg-surface' : ''
    }`}
    testID={`drawer-nav-${label.toLowerCase()}`}
  >
    {icon}
    <Text
      className={`ml-3 text-sm font-medium ${
        isActive ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

const ICON_SIZE = 20;

const DRAWER_ITEMS = [
  { key: 'ProjectsTab' as const, label: 'Projects', Icon: FolderOpen },
  { key: 'MigrationTab' as const, label: 'Migration', Icon: ArrowRightLeft },
  { key: 'SettingsTab' as const, label: 'Settings', Icon: Settings },
] as const;

const CustomDrawerContent = ({
  state,
  navigation,
}: DrawerContentComponentProps): React.JSX.Element => {
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = useCallback((): void => {
    void logout();
  }, [logout]);

  return (
    <View
      className="flex-1 border-r border-border bg-background px-3 pb-6 pt-8"
      testID="app-drawer-content"
    >
      <View className="mb-8 px-3">
        <Text className="text-lg font-bold text-foreground">
          COA Migration
        </Text>
      </View>

      <View className="flex-1 gap-1">
        {DRAWER_ITEMS.map((item, index) => {
          const isActive = state.index === index;
          const iconColor = isActive
            ? colors.foreground
            : colors.mutedForeground;

          return (
            <NavItem
              key={item.key}
              label={item.label}
              icon={<item.Icon color={iconColor} size={ICON_SIZE} />}
              isActive={isActive}
              onPress={() => navigation.navigate(item.key)}
            />
          );
        })}
      </View>

      <Pressable
        onPress={handleLogout}
        className="flex-row items-center rounded-lg px-3 py-3"
        testID="drawer-logout-button"
      >
        <LogOut color={colors.destructive} size={ICON_SIZE} />
        <Text className="ml-3 text-sm font-medium text-destructive">
          Logout
        </Text>
      </Pressable>
    </View>
  );
};

export const AppDrawer = (): React.JSX.Element => {
  const drawerStyle = {
    width: 260,
    backgroundColor: colors.background,
  } as const;

  return (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerType: 'permanent',
        drawerStyle,
        overlayColor: 'transparent',
      }}
    >
      <Drawer.Screen name="ProjectsTab" component={ProjectsStack} />
      <Drawer.Screen name="MigrationTab" component={MigrationStack} />
      <Drawer.Screen name="SettingsTab" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};
