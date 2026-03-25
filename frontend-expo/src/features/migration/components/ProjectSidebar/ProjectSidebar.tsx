import React from 'react';
import { Modal, Pressable, SafeAreaView, Text, View } from 'react-native';
import { PanelLeft, PanelLeftClose, X } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { usePlatform } from '@/shared/hooks/usePlatform';
import { SidebarContent } from './SidebarContent';
import type { ProjectSidebarProps } from './sidebar.types';

const SIDEBAR_TEST_ID = 'project-sidebar';

const WebSidebar = ({
  isOpen,
  onToggle,
  testID = SIDEBAR_TEST_ID,
  ...contentProps
}: ProjectSidebarProps) => (
  <>
    {isOpen ? (
      <View
        className="absolute bottom-0 left-0 top-16 z-30 w-64 border-r border-border bg-background shadow-md"
        testID={`${testID}-panel`}
      >
        <View className="flex-row items-center justify-between border-b border-border px-3 py-2">
          <Text className="font-heading text-sm font-semibold text-foreground">
            Project Info
          </Text>
          <Pressable onPress={onToggle} hitSlop={8} testID={`${testID}-close`}>
            <PanelLeftClose size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <SidebarContent {...contentProps} testID={`${testID}-content`} />
      </View>
    ) : null}

    {!isOpen ? (
      <Pressable
        onPress={onToggle}
        className="absolute left-0 top-24 z-20 rounded-r-md border border-l-0 border-border bg-background p-2 shadow-sm"
        hitSlop={4}
        testID={`${testID}-toggle`}
      >
        <PanelLeft size={18} color={colors.mutedForeground} />
      </Pressable>
    ) : null}
  </>
);

const MobileSidebar = ({
  isOpen,
  onToggle,
  testID = SIDEBAR_TEST_ID,
  ...contentProps
}: ProjectSidebarProps) => (
  <Modal
    visible={isOpen}
    animationType="slide"
    transparent
    onRequestClose={onToggle}
  >
    <Pressable
      className="flex-1 bg-black/40"
      onPress={onToggle}
      testID={`${testID}-backdrop`}
    >
      <View className="flex-1" />
    </Pressable>
    <SafeAreaView className="h-3/4 rounded-t-2xl border-t border-border bg-background shadow-lg">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="font-heading text-base font-semibold text-foreground">
          Project Info
        </Text>
        <Pressable onPress={onToggle} hitSlop={8} testID={`${testID}-close`}>
          <X size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <SidebarContent {...contentProps} testID={`${testID}-content`} />
    </SafeAreaView>
  </Modal>
);

export const ProjectSidebar = (props: ProjectSidebarProps) => {
  const { isWeb } = usePlatform();
  return isWeb ? <WebSidebar {...props} /> : <MobileSidebar {...props} />;
};
