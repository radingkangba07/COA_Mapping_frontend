import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FolderOpen, ArrowRightLeft, Settings } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { ProjectsStack } from '../stacks/ProjectsStack';
import { MigrationStack } from '../stacks/MigrationStack';
import { SettingsStack } from '../stacks/SettingsStack';
import type { AppTabsParamList } from '../types';

const Tabs = createBottomTabNavigator<AppTabsParamList>();

interface TabBarIconProps {
  color: string;
  size: number;
}

const TAB_BAR_STYLE = {
  backgroundColor: colors.background,
  borderTopColor: colors.border,
} as const;

const ProjectsIcon = ({ color, size }: TabBarIconProps): React.JSX.Element => (
  <FolderOpen color={color} size={size} />
);

const MigrationIcon = ({ color, size }: TabBarIconProps): React.JSX.Element => (
  <ArrowRightLeft color={color} size={size} />
);

const SettingsIcon = ({ color, size }: TabBarIconProps): React.JSX.Element => (
  <Settings color={color} size={size} />
);

export const AppTabs = (): React.JSX.Element => (
  <Tabs.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: TAB_BAR_STYLE,
    }}
  >
    <Tabs.Screen
      name="ProjectsTab"
      component={ProjectsStack}
      options={{
        tabBarLabel: 'Projects',
        tabBarIcon: ProjectsIcon,
      }}
    />
    <Tabs.Screen
      name="MigrationTab"
      component={MigrationStack}
      options={{
        tabBarLabel: 'Migration',
        tabBarIcon: MigrationIcon,
      }}
    />
    <Tabs.Screen
      name="SettingsTab"
      component={SettingsStack}
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: SettingsIcon,
      }}
    />
  </Tabs.Navigator>
);
