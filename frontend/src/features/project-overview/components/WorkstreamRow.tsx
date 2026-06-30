import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '@/config/theme';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import type { Workstream } from '../types/workstream.types';

export const COL_FLEX = {
  name:         2.5,
  projectId:    1,
  status:       1.8,
  progress:     2,
  currentStage: 1.5,
  action:       0.8,
} as const;

interface WorkstreamRowProps {
  readonly workstream: Workstream;
  readonly onOpen: (w: Workstream) => void;
  readonly testID?: string;
}

const CellText = ({ children, muted = false }: { children: React.ReactNode; muted?: boolean }): React.JSX.Element => (
  <Text
    style={{ fontSize: 13, color: muted ? colors.mutedForeground : colors.foreground }}
    numberOfLines={1}
  >
    {children}
  </Text>
);

export const WorkstreamRow = ({
  workstream: w,
  onOpen,
  testID,
}: WorkstreamRowProps): React.JSX.Element => {
  const rowBase: React.ComponentProps<typeof View>['style'] = {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    opacity: w.included ? 1 : 0.5,
  };

  if (!w.included) {
    return (
      <View style={rowBase} testID={testID}>
        <View style={{ flex: COL_FLEX.name }}><CellText muted>{w.name}</CellText></View>
        <View style={{ flex: COL_FLEX.projectId }}><CellText muted>{w.projectId}</CellText></View>
        <View style={{ flex: COL_FLEX.status }}>
          <StatusBadge status="not_included" />
        </View>
        <View style={{ flex: COL_FLEX.progress }}><CellText muted>—</CellText></View>
        <View style={{ flex: COL_FLEX.currentStage, paddingLeft: 8 }}><CellText muted>—</CellText></View>
        <View style={{ flex: COL_FLEX.action }}>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Not Included</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onOpen(w)}
      style={({ pressed }) => [rowBase, pressed && { backgroundColor: colors.muted }]}
      testID={testID}
    >
      <View style={{ flex: COL_FLEX.name }}><CellText>{w.name}</CellText></View>
      <View style={{ flex: COL_FLEX.projectId }}>
        <Text style={{ fontSize: 12, fontFamily: 'JetBrainsMono', color: colors.mutedForeground }}>
          {w.projectId}
        </Text>
      </View>
      <View style={{ flex: COL_FLEX.status }}>
        <StatusBadge status={w.status} />
      </View>
      <View style={{ flex: COL_FLEX.progress }}>
        <ProgressBar value={w.progress} showLabel />
      </View>
      <View style={{ flex: COL_FLEX.currentStage, paddingLeft: 8 }}>
        <CellText>{w.currentStage}</CellText>
      </View>
      <View style={{ flex: COL_FLEX.action }}>
        <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
          Open
        </Text>
      </View>
    </Pressable>
  );
};
