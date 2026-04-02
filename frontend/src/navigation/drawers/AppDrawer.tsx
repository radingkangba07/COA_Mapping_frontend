import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {
  FolderOpen, ArrowRightLeft, Settings, LogOut, ChevronsLeft, ChevronsRight,
} from 'lucide-react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProjectsStack } from '../stacks/ProjectsStack';
import { MigrationStack } from '../stacks/MigrationStack';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { AppDrawerParamList } from '../types';

const Drawer = createDrawerNavigator<AppDrawerParamList>();

const ICON_SIZE = 20;
const COLLAPSE_ICON_SIZE = 18;
const DRAWER_WIDTH_EXPANDED = 260;
const DRAWER_WIDTH_COLLAPSED = 64;

const DRAWER_ITEMS = [
  { key: 'ProjectsTab' as const, label: 'Projects', Icon: FolderOpen },
  { key: 'MigrationTab' as const, label: 'Migration', Icon: ArrowRightLeft },
  { key: 'SettingsTab' as const, label: 'Settings', Icon: Settings },
] as const;

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  onPress: () => void;
}

const MaybeTooltip = (
  { show, content, testID, children }: {
    show: boolean; content: string; testID: string; children: React.ReactNode;
  },
): React.JSX.Element => (
  show
    ? <Tooltip content={content} position="bottom" testID={testID}>{children}</Tooltip>
    : <>{children}</>
);

const NavItem = ({
  label, icon, isActive, isCollapsed, onPress,
}: NavItemProps): React.JSX.Element => (
  <MaybeTooltip show={isCollapsed} content={label} testID={`tooltip-${label.toLowerCase()}`}>
    <Pressable
      onPress={onPress}
      className={`items-center rounded-lg py-3 ${
        isCollapsed ? 'justify-center px-2' : 'flex-row px-3'
      } ${isActive ? 'bg-surface' : ''}`}
      testID={`drawer-nav-${label.toLowerCase()}`}
    >
      {icon}
      {!isCollapsed && (
        <Text
          className={`ml-3 text-sm font-medium ${
            isActive ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  </MaybeTooltip>
);

const CustomDrawerContent = ({
  state, navigation,
}: DrawerContentComponentProps): React.JSX.Element => {
  const logout = useAuthStore((s) => s.logout);
  const isCollapsed = useAppStore((s) => s.isDrawerCollapsed);
  const toggleCollapse = useAppStore((s) => s.toggleDrawerCollapsed);

  const handleLogout = useCallback((): void => {
    void logout();
  }, [logout]);

  const CollapseIcon = isCollapsed ? ChevronsRight : ChevronsLeft;

  return (
    <View
      className={`flex-1 border-r border-border bg-background pb-6 pt-8 ${
        isCollapsed ? 'items-center px-2' : 'px-3'
      }`}
      testID="app-drawer-content"
    >
      {!isCollapsed ? (
        <View className="mb-8 px-3">
          <Text className="text-lg font-bold text-foreground">COA Migration</Text>
        </View>
      ) : (
        <View className="mb-8" />
      )}

      <View className="flex-1 gap-1">
        {DRAWER_ITEMS.map((item, index) => {
          const isActive = state.index === index;
          const iconColor = isActive ? colors.foreground : colors.mutedForeground;
          return (
            <NavItem
              key={item.key}
              label={item.label}
              icon={<item.Icon color={iconColor} size={ICON_SIZE} />}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onPress={() => navigation.navigate(item.key)}
            />
          );
        })}
      </View>

      <MaybeTooltip show={isCollapsed} content="Expand" testID="tooltip-collapse">
        <Pressable
          onPress={toggleCollapse}
          className="flex-row items-center justify-center rounded-lg px-3 py-3"
          testID="drawer-collapse-button"
        >
          <CollapseIcon color={colors.mutedForeground} size={COLLAPSE_ICON_SIZE} />
          {!isCollapsed && (
            <Text className="ml-3 text-sm font-medium text-muted-foreground">Collapse</Text>
          )}
        </Pressable>
      </MaybeTooltip>

      <MaybeTooltip show={isCollapsed} content="Logout" testID="tooltip-logout">
        <Pressable
          onPress={handleLogout}
          className={`items-center rounded-lg py-3 ${
            isCollapsed ? 'justify-center px-2' : 'flex-row px-3'
          }`}
          testID="drawer-logout-button"
        >
          <LogOut color={colors.destructive} size={ICON_SIZE} />
          {!isCollapsed && (
            <Text className="ml-3 text-sm font-medium text-destructive">Logout</Text>
          )}
        </Pressable>
      </MaybeTooltip>
    </View>
  );
};

export const AppDrawer = (): React.JSX.Element => {
  useAppStore((s) => s.theme);
  const isCollapsed = useAppStore((s) => s.isDrawerCollapsed);

  const drawerStyle = useMemo(() => ({
    width: isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED,
    backgroundColor: colors.background,
    borderRightColor: colors.border,
    // Web-only: CSS transition for smooth width animation. No-op on native.
    transition: 'width 200ms ease',
  } as const), [isCollapsed]);

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
