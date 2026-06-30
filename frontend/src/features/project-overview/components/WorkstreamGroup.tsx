import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { WorkstreamRow, COL_WIDTHS } from './WorkstreamRow';
import type { Workstream } from '../types/workstream.types';

const TABLE_HEADERS: { label: string; width: number }[] = [
  { label: 'Workstream',    width: COL_WIDTHS.name         },
  { label: 'Project ID',    width: COL_WIDTHS.projectId    },
  { label: 'Status',        width: COL_WIDTHS.status       },
  { label: 'Progress',      width: COL_WIDTHS.progress     },
  { label: 'Current Stage', width: COL_WIDTHS.currentStage },
  { label: 'Action',        width: COL_WIDTHS.action       },
];

interface WorkstreamGroupProps {
  readonly title: string;
  readonly workstreams: readonly Workstream[];
  readonly onOpen: (w: Workstream) => void;
  /** Controlled expand state. Omit to use internal uncontrolled state (default: expanded). */
  readonly expanded?: boolean;
  readonly onToggle?: () => void;
  readonly testID?: string;
}

export const WorkstreamGroup = ({
  title,
  workstreams,
  onOpen,
  expanded,
  onToggle,
  testID,
}: WorkstreamGroupProps): React.JSX.Element => {
  const [internalExpanded, setInternalExpanded] = useState(true);

  const isExpanded = expanded !== undefined ? expanded : internalExpanded;

  const handleToggle = (): void => {
    if (onToggle !== undefined) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const selectedCount = workstreams.filter((w) => w.included).length;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        backgroundColor: colors.card,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: pressed ? colors.surface : colors.card,
        })}
        testID={testID ? `${testID}-header` : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
            {title}
          </Text>
          <View
            style={{
              backgroundColor: `${colors.accent}18`,
              borderRadius: 99,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>
              {selectedCount} of {workstreams.length} selected
            </Text>
          </View>
        </View>

        {isExpanded ? (
          <ChevronUp size={18} color={colors.mutedForeground} />
        ) : (
          <ChevronDown size={18} color={colors.mutedForeground} />
        )}
      </Pressable>

      {/* ── Table ──────────────────────────────────────── */}
      {isExpanded && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
          testID={testID ? `${testID}-table` : undefined}
        >
          <View>
            {/* Table header row */}
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: colors.surface,
              }}
            >
              {TABLE_HEADERS.map((col) => (
                <View key={col.label} style={{ width: col.width }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.mutedForeground,
                      letterSpacing: 0.06,
                      textTransform: 'uppercase',
                    }}
                    numberOfLines={1}
                  >
                    {col.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Workstream rows */}
            {workstreams.map((w) => (
              <WorkstreamRow
                key={w.id}
                workstream={w}
                onOpen={onOpen}
                testID={testID ? `${testID}-row-${w.id}` : undefined}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};
