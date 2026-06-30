import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Home,
  Folder,
  GitBranch,
  CheckSquare,
  Download,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { cn } from '@/shared/utils/string.utils';
import { colors } from '@/config/theme';

export type NavKey =
  | 'overview'
  | 'workstreams'
  | 'mapping'
  | 'validations'
  | 'exports'
  | 'reports'
  | 'settings';

interface NavItem {
  readonly key: NavKey;
  readonly label: string;
  readonly icon: React.ComponentType<{ size: number; color: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: Home },
  { key: 'workstreams', label: 'Workstreams', icon: Folder },
  { key: 'mapping', label: 'Mapping Center', icon: GitBranch },
  { key: 'validations', label: 'Validations', icon: CheckSquare },
  { key: 'exports', label: 'Exports', icon: Download },
  { key: 'reports', label: 'Reports', icon: BarChart2 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

interface SideNavProps {
  readonly active: NavKey;
  readonly onPress: (key: NavKey) => void;
  readonly testID?: string;
}

export const SideNav = ({ active, onPress, testID }: SideNavProps): React.JSX.Element => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <View
      className="flex-col border-r border-border bg-surface"
      style={{ width: isCollapsed ? 56 : 208 }}
      testID={testID}
    >
      <View className="flex-1 pt-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              onPress={() => onPress(item.key)}
              className={cn(
                'flex-row items-center mx-2 px-3 py-2.5 rounded-md mb-0.5',
                isActive ? 'bg-primary/10' : '',
              )}
              testID={`sidenav-item-${item.key}`}
            >
              <Icon
                size={18}
                color={isActive ? colors.primary : colors.mutedForeground}
              />
              {!isCollapsed && (
                <Text
                  className={cn(
                    'font-body text-sm ml-3',
                    isActive ? 'text-primary font-semibold' : 'text-foreground',
                  )}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => setIsCollapsed((prev) => !prev)}
        className="flex-row items-center border-t border-border py-3 mx-2 px-3 rounded-md"
        style={{ gap: 8 }}
        testID="sidenav-collapse-toggle"
      >
        {isCollapsed ? (
          <ChevronRight size={16} color={colors.mutedForeground} />
        ) : (
          <>
            <ChevronLeft size={16} color={colors.mutedForeground} />
            <Text className="font-body text-sm text-muted-foreground">Collapse</Text>
          </>
        )}
      </Pressable>
    </View>
  );
};
