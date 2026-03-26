import React, { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { Switch } from '@/shared/components/ui/Switch';
import { useTheme, useAppActions } from '@/shared/store/app.selectors';
import { colors } from '@/config/theme';

export const SettingsScreen = (): React.JSX.Element => {
  const theme = useTheme();
  const { toggleTheme } = useAppActions();
  const isDark = theme === 'dark';

  const handleToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6"
      testID="settings-screen"
    >
      <Text className="mb-6 font-heading text-2xl font-semibold text-foreground">
        Settings
      </Text>

      {/* Appearance Section */}
      <Text className="mb-2 px-1 font-body text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Appearance
      </Text>

      <View className="rounded-lg border border-border bg-card px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            {isDark ? (
              <Moon size={20} color={colors.mutedForeground} />
            ) : (
              <Sun size={20} color={colors.mutedForeground} />
            )}
            <View>
              <Text className="font-body text-sm font-medium text-card-foreground">
                Dark Mode
              </Text>
              <Text className="font-body text-xs text-muted-foreground">
                {isDark ? 'Dark theme active' : 'Light theme active'}
              </Text>
            </View>
          </View>

          <Switch
            checked={isDark}
            onCheckedChange={handleToggle}
            testID="theme-toggle"
          />
        </View>
      </View>
    </ScrollView>
  );
};
