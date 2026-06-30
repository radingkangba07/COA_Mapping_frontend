import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useNavigationState } from '@react-navigation/native';
import {
  FolderOpen, ArrowRightLeft, Settings, ChevronsLeft, ChevronsRight,
} from 'lucide-react-native';
import { useAppStore } from '@/shared/store/app.store';
import { colors } from '@/config/theme';
import { Tooltip } from '@/shared/components/ui/Tooltip';
import { ProjectsStack } from '../stacks/ProjectsStack';
import { MigrationStack } from '../stacks/MigrationStack';
import { SettingsStack } from '../stacks/SettingsStack';
import { OrgSwitcher } from '@/features/projects/components/OrgSwitcher';
import type { AppDrawerParamList } from '../types';

const PROJECT_SCREENS = new Set(['ProjectOverview', 'WorkstreamDetail']);

function useIsOnProjectScreen(): boolean {
  return useNavigationState((state) => {
    const projectsTab = state?.routes?.find((r) => r.name === 'ProjectsTab');
    if (!projectsTab?.state) return false;
    const idx = projectsTab.state.index ?? 0;
    const active = projectsTab.state.routes[idx];
    return PROJECT_SCREENS.has(active?.name ?? '');
  });
}

const Drawer = createDrawerNavigator<AppDrawerParamList>();

const ICON_SIZE = 20;
const COLLAPSE_ICON_SIZE = 18;
const DRAWER_WIDTH_EXPANDED = 240;
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
      className={`items-center rounded-lg py-2.5 ${
        isCollapsed ? 'justify-center px-2' : 'flex-row px-3'
      }`}
      style={{ backgroundColor: isActive ? colors.primary : 'transparent' }}
      testID={`drawer-nav-${label.toLowerCase()}`}
    >
      {icon}
      {!isCollapsed && (
        <Text
          className="ml-3 text-sm font-medium"
          style={{ color: isActive ? colors.primaryForeground : colors.mutedForeground }}
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
  const isCollapsed = useAppStore((s) => s.isDrawerCollapsed);
  const toggleCollapse = useAppStore((s) => s.toggleDrawerCollapsed);

  return (
    <View
      className={`flex-1 pb-4 pt-5 ${isCollapsed ? 'items-center px-2' : 'px-3'}`}
      style={{ backgroundColor: colors.surface }}
      testID="app-drawer-content"
    >
      {/* Org switcher */}
      <View className={`mb-4 ${isCollapsed ? 'items-center' : 'px-1'}`}>
        <OrgSwitcher collapsed={isCollapsed} />
      </View>

      {/* Nav items */}
      <View className="flex-1 gap-0.5">
        {DRAWER_ITEMS.map((item, index) => {
          const isActive = state.index === index;
          return (
            <NavItem
              key={item.key}
              label={item.label}
              icon={<item.Icon color={isActive ? colors.primaryForeground : colors.mutedForeground} size={ICON_SIZE} />}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onPress={() => {
                if (item.key === 'SettingsTab') {
                  navigation.navigate('SettingsTab', { screen: 'SettingsHome' });
                } else if (item.key === 'ProjectsTab') {
                  navigation.navigate('ProjectsTab', { screen: 'ProjectsList' } as never);
                } else {
                  navigation.navigate(item.key);
                }
              }}
            />
          );
        })}
      </View>

      {/* Collapse toggle at bottom — icon only */}
      <View
        className="pt-3 items-center"
        style={{ borderTopWidth: 1, borderTopColor: colors.border }}
      >
        <MaybeTooltip
          show={isCollapsed}
          content={isCollapsed ? 'Expand' : 'Collapse'}
          testID={`tooltip-${isCollapsed ? 'expand' : 'collapse'}`}
        >
          <Pressable
            onPress={toggleCollapse}
            className="items-center justify-center rounded-lg p-2"
            hitSlop={8}
            testID={isCollapsed ? 'drawer-expand-button' : 'drawer-collapse-button'}
          >
            {isCollapsed
              ? <ChevronsRight color={colors.mutedForeground} size={COLLAPSE_ICON_SIZE} />
              : <ChevronsLeft color={colors.mutedForeground} size={COLLAPSE_ICON_SIZE} />}
          </Pressable>
        </MaybeTooltip>
      </View>
    </View>
  );
};

// ─── Drawer Navigator ──────────────────────────────────────────────────────

export const AppDrawer = (): React.JSX.Element => {
  useAppStore((s) => s.theme);
  const isCollapsed = useAppStore((s) => s.isDrawerCollapsed);
  const hideDrawer = useIsOnProjectScreen();

  const drawerStyle = useMemo(() => ({
    width: hideDrawer ? 0 : (isCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED),
    backgroundColor: colors.surface,
    borderRightWidth: hideDrawer ? 0 : 1,
    borderRightColor: colors.border,
    transition: 'width 200ms ease',
  } as const), [isCollapsed, hideDrawer]);

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
      <Drawer.Screen name="SettingsTab" component={SettingsStack} />
    </Drawer.Navigator>
  );
};
