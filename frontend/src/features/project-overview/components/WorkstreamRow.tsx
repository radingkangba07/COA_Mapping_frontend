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
type ColFlexMap = { readonly sm: ColFlex; readonly md: ColFlex; readonly lg: ColFlex; readonly xl: ColFlex };

const COL_FLEX_MAP: ColFlexMap = {
  sm: { name: 1.8, projectId: 0.7,  status: 1.3, percent: 0.55, progress: 1.4, currentStage: 1.05, action: 1.0  },
  md: { name: 1.9, projectId: 0.7,  status: 1.3, percent: 0.55, progress: 1.5, currentStage: 1.05, action: 1.0  },
  lg: { name: 1.8, projectId: 0.7,  status: 1.2, percent: 0.55, progress: 1.5, currentStage: 1.1,  action: 1.0  },
  xl: { name: 1.7, projectId: 0.65, status: 1.1, percent: 0.5,  progress: 1.5, currentStage: 1.0,  action: 0.95 },
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
    className={`text-center font-body text-base ${muted ? 'text-muted-foreground' : 'text-foreground'}`}
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    opacity: w.included ? 1 : 0.5,
  };

  if (!w.included) {
    return (
      <View className="border-t border-border" style={rowBase} testID={testID}>
        <View style={{ flex: colFlex.name }}>
          <Text className="text-center font-body text-base text-muted-foreground" numberOfLines={1}>
            {w.name}
          </Text>
        </View>
        <View style={{ flex: colFlex.projectId }}>
          <Text className="text-center font-body text-base text-muted-foreground" numberOfLines={1}>
            {w.projectId}
          </Text>
        </View>
        <View style={{ flex: colFlex.status, paddingLeft: 8 }}>
          <StatusBadge status="not_included" />
        </View>
        <View style={{ flex: colFlex.percent + colFlex.progress, paddingRight: 16 }}>
          <CellText muted>—</CellText>
        </View>
        <View style={{ flex: colFlex.currentStage, paddingLeft: 8 }}>
          <Text className="text-center font-body text-base text-muted-foreground" numberOfLines={1}>
            —
          </Text>
        </View>
        <View style={{ flex: colFlex.action }}>
          <Text className="text-center font-body text-base text-muted-foreground" numberOfLines={1}>
            Not Included
          </Text>
        </View>
      </View>
    );
  }

  const sharedCells = (
    <>
      <View style={{ flex: colFlex.name }}>
        <Text className="text-center font-body text-base text-foreground" numberOfLines={1}>
          {w.name}
        </Text>
      </View>
      <View style={{ flex: colFlex.projectId }}>
        <Text className="text-center font-body text-base text-foreground" numberOfLines={1}>
          {w.projectId}
        </Text>
      </View>
      <View style={{ flex: colFlex.status, paddingLeft: 8 }}>
        <StatusBadge status={w.status} />
      </View>
      <View
        style={{
          flex: colFlex.percent + colFlex.progress,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingRight: 16,
        }}
      >
        <Text className="text-center font-body text-base text-primary" numberOfLines={1}>
          {w.progress}%
        </Text>
        <View style={{ flex: 1, maxWidth: 260 }}>
          <ProgressBar value={w.progress} />
        </View>
      </View>
      <View style={{ flex: colFlex.currentStage, paddingLeft: 8 }}>
        <Text className="text-center font-body text-base text-foreground" numberOfLines={1}>
          {w.currentStage}
        </Text>
      </View>
    </>
  );

  // Only Chart of Accounts has a built flow — other included workstreams are
  // visible but not yet openable.
  if (w.name === 'Chart of Accounts') {
    return (
      <View className="border-t border-border">
        <Pressable
          onPress={() => onOpen(w)}
          style={({ pressed }) => [rowBase, pressed && { backgroundColor: colors.muted }]}
          testID={testID}
        >
          {sharedCells}
          <View style={{ flex: colFlex.action }}>
            <Text className="text-center font-body text-base text-accent" numberOfLines={1}>
              Open
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="border-t border-border" style={rowBase} testID={testID}>
      {sharedCells}
      <View style={{ flex: colFlex.action }}>
        <Text className="text-center font-body text-base text-muted-foreground" numberOfLines={1}>—</Text>
      </View>
    </View>
  );
};
