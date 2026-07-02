import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '@/config/theme';
import { usePlatform } from '@/shared/hooks/usePlatform';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';
import type { Workstream } from '../types/workstream.types';

export type ColFlex = {
  readonly name: number;
  readonly projectId: number;
  readonly status: number;
  readonly percent: number;
  readonly progress: number;
  readonly currentStage: number;
  readonly action: number;
};

// Tighten fixed-content columns (status badge, project ID, action) on wider
// screens so the progress bar and workstream name have proportional room.
const COL_FLEX_MAP: Record<string, ColFlex> = {
  sm: { name: 2.2, projectId: 0.85, status: 1.6,  percent: 0.6,  progress: 1.8, currentStage: 1.1, action: 0.65 },
  md: { name: 2.3, projectId: 0.9,  status: 1.6,  percent: 0.62, progress: 1.9, currentStage: 1.2, action: 0.7  },
  lg: { name: 2.2, projectId: 0.85, status: 1.5,  percent: 0.6,  progress: 2.0, currentStage: 1.3, action: 0.7  },
  xl: { name: 2.0, projectId: 0.75, status: 1.3,  percent: 0.55, progress: 2.0, currentStage: 1.2, action: 0.65 },
};

// Kept for backward compatibility (tests, direct imports) — uses lg values.
export const COL_FLEX: ColFlex = COL_FLEX_MAP.lg;

export function useColFlex(): ColFlex {
  const { breakpoint } = usePlatform();
  return COL_FLEX_MAP[breakpoint] ?? COL_FLEX_MAP.lg;
}

interface WorkstreamRowProps {
  readonly workstream: Workstream;
  readonly onOpen: (w: Workstream) => void;
  readonly colFlex?: ColFlex;
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
  colFlex = COL_FLEX,
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
        <View style={{ flex: colFlex.name }}><CellText muted>{w.name}</CellText></View>
        <View style={{ flex: colFlex.projectId }}><CellText muted>{w.projectId}</CellText></View>
        <View style={{ flex: colFlex.status, paddingLeft: 8 }}>
          <StatusBadge status="not_included" />
        </View>
        <View style={{ flex: colFlex.percent }}><CellText muted>—</CellText></View>
        <View style={{ flex: colFlex.progress, paddingRight: 16 }}><CellText muted>—</CellText></View>
        <View style={{ flex: colFlex.currentStage, paddingLeft: 8 }}><CellText muted>—</CellText></View>
        <View style={{ flex: colFlex.action }}>
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
      <View style={{ flex: colFlex.name }}><CellText>{w.name}</CellText></View>
      <View style={{ flex: colFlex.projectId }}>
        <Text style={{ fontSize: 12, fontFamily: 'JetBrainsMono', color: colors.mutedForeground }}>
          {w.projectId}
        </Text>
      </View>
      <View style={{ flex: colFlex.status, paddingLeft: 8 }}>
        <StatusBadge status={w.status} />
      </View>
      <View style={{ flex: colFlex.percent }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
          {w.progress}%
        </Text>
      </View>
      <View style={{ flex: colFlex.progress, paddingRight: 16 }}>
        <ProgressBar value={w.progress} />
      </View>
      <View style={{ flex: colFlex.currentStage, paddingLeft: 8 }}>
        <CellText>{w.currentStage}</CellText>
      </View>
      <View style={{ flex: colFlex.action }}>
        <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '600' }}>
          Open
        </Text>
      </View>
    </Pressable>
  );
};
