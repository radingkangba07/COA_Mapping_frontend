import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, X } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { BREAKPOINTS } from '@/shared/utils/platform.utils';
import { MigrationTopBar } from './MigrationTopBar';
import { SidebarContent } from './ProjectSidebar/SidebarContent';
import { useSidebarData } from '../hooks/useSidebarData';

export interface MigrationLayoutProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly projectId: string;
  readonly onBack: () => void;
  readonly children: React.ReactNode;
  readonly scroll?: boolean;
  readonly rightActions?: React.ReactNode;
  readonly testID?: string;
}

const SCROLL_CONTENT_STYLE = { flexGrow: 1 } as const;

export const MigrationLayout = ({
  title,
  subtitle,
  projectId,
  onBack,
  children,
  scroll = false,
  rightActions,
  testID,
}: MigrationLayoutProps): React.JSX.Element => {
  const sidebarProps = useSidebarData(projectId);
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINTS.md;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  const contentArea = scroll ? (
    <ScrollView
      contentContainerStyle={SCROLL_CONTENT_STYLE}
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 px-4 py-4 md:px-6 lg:px-8">{children}</View>
    </ScrollView>
  ) : (
    <View className="flex-1 px-4 py-4 md:px-6 lg:px-8">{children}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" testID={testID}>
      <MigrationTopBar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        rightActions={rightActions}
        testID={testID ? `${testID}-topbar` : undefined}
      />

      <View className="flex-1 flex-row">
        {isDesktop ? (
          <View className="w-64 border-r border-border bg-card">
            <SidebarContent {...sidebarProps} />
          </View>
        ) : null}

        <View className="flex-1">{contentArea}</View>
      </View>

      {!isDesktop ? (
        <>
          <Pressable
            className="absolute bottom-4 right-4 z-20 h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg"
            onPress={toggleSidebar}
            testID={testID ? `${testID}-fab` : undefined}
          >
            <ClipboardList size={20} color={colors.primaryForeground} />
          </Pressable>

          <Modal
            visible={sidebarOpen}
            animationType="slide"
            transparent
            onRequestClose={toggleSidebar}
          >
            <Pressable
              className="flex-1 bg-black/40"
              onPress={toggleSidebar}
            >
              <View className="flex-1" />
            </Pressable>
            <SafeAreaView className="h-3/4 rounded-t-2xl border-t border-border bg-background shadow-lg">
              <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
                <Text className="font-heading text-base font-semibold text-foreground">
                  Project Info
                </Text>
                <Pressable onPress={toggleSidebar} hitSlop={8}>
                  <X size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <SidebarContent {...sidebarProps} />
            </SafeAreaView>
          </Modal>
        </>
      ) : null}
    </SafeAreaView>
  );
};
