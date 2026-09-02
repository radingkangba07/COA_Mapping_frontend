import React, { useState } from 'react';
import { ChevronsLeft, ChevronsRight, Pencil } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { useAppStore } from '@/shared/store/app.store';
import { MembersSection } from './MembersSection';
import { ProjectIcon } from '@/shared/components/icons/ProjectIcon';
import { ProjectMigrationDetails } from './ProjectMigrationDetails';
import type { ProjectAsidePanelProps } from './project-aside.types';

// Matches the reference HTML's aside exactly (236px, 18/16/28 padding) rather
// than a round Tailwind-scale number — see
// `Project Docs/DP · Items · Source Data Profile.html`.
const WIDTH = 236;

// Sized from the actual label rather than a fixed guess — a fixed extent
// happened to fit the reference's own short example ("L124 · Project") but
// truncated a longer real name ("Item Profile · Project") to "IT...". Same
// fix shape as the FieldsTable "#" column width earlier this session.
const COLLAPSED_LABEL_MIN_EXTENT = 160;
const COLLAPSED_LABEL_CHAR_WIDTH = 9; // approx px/char at 12px bold uppercase + 0.12em tracking

function collapsedLabelExtentFor(label: string): number {
  return Math.max(COLLAPSED_LABEL_MIN_EXTENT, label.length * COLLAPSED_LABEL_CHAR_WIDTH);
}

export function ProjectAsidePanel({
  projectId,
  orgId,
  projectName,
  createdAt,
  createdByName,
  updatedAt,
  lastEditedBy,
  sourceERP,
  targetERP,
  sourceRowCount,
  targetRowCount,
  currentUser,
  defaultOpen = true,
  testID,
}: ProjectAsidePanelProps): React.JSX.Element {
  // Forces re-render on theme toggle so colors.* below reads fresh values —
  // colors is a plain proxy, not a hook, so nothing else here re-renders
  // this component when the theme changes.
  useAppStore((s) => s.theme);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!isOpen) {
    const collapsedLabel = `${projectName} · Project`;
    const labelExtent = collapsedLabelExtentFor(collapsedLabel);

    return (
      <View
        className="items-center gap-2.5 border-r border-border bg-card px-2 py-[18px]"
        testID={testID ? `${testID}-collapsed` : undefined}
      >
        <Pressable
          onPress={() => setIsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Show project details"
          hitSlop={8}
          className="h-[30px] w-[30px] items-center justify-center rounded-lg border border-border"
          testID={testID ? `${testID}-expand-button` : undefined}
        >
          <ChevronsRight size={16} color={colors.mutedForeground} />
        </Pressable>
        <View className="w-[30px] items-center justify-center overflow-hidden" style={{ height: labelExtent }}>
          <Text
            style={{ width: labelExtent, transform: [{ rotate: '90deg' }] }}
            className="text-center font-heading text-[12px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            {collapsedLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="border-r border-border bg-card px-4 pb-[28px] pt-[18px]"
      style={{ width: WIDTH, flexGrow: 0, flexShrink: 0 }}
      testID={testID}
    >
      {/* Header row: icon + name + edit-pencil sit tightly together on the
          flexible ~90% side (Text uses `shrink`, not `flex-1`, so the pencil
          stays immediately next to the name instead of being pushed to the
          row's edge); the collapse control is the fixed ~10% on the right —
          matches the reference's single-row layout (icon, title, pencil,
          spacer, collapse). */}
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <ProjectIcon size={20} color={colors.mutedForeground} />
          <Text className="font-heading shrink text-[17px] font-bold text-foreground" numberOfLines={2}>
            {projectName}
          </Text>
          <Pencil size={14} color={colors.mutedForeground} />
        </View>
        <Pressable
          onPress={() => setIsOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Hide project details"
          hitSlop={8}
          className="h-[26px] w-[26px] items-center justify-center rounded-lg"
          testID={testID ? `${testID}-collapse-button` : undefined}
        >
          <ChevronsLeft size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {currentUser ? (
        <View className="mt-[16px] flex-row items-center gap-[9px]">
          <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Text className="font-body text-[10px] font-bold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="font-body text-[13.5px] font-medium text-foreground">{currentUser.name}</Text>
        </View>
      ) : null}

      <View className="mt-[14px] border-b border-border pb-[14px]">
        <MembersSection projectId={projectId} orgId={orgId} testID={testID ? `${testID}-members` : undefined} />
      </View>

      <ProjectMigrationDetails
        projectId={projectId}
        createdAt={createdAt}
        createdByName={createdByName}
        updatedAt={updatedAt}
        lastEditedBy={lastEditedBy}
        sourceERP={sourceERP}
        targetERP={targetERP}
        sourceRowCount={sourceRowCount}
        targetRowCount={targetRowCount}
      />
    </ScrollView>
  );
}
