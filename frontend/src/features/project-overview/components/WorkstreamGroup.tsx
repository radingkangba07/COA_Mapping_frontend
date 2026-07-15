import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { cardShadow, colors } from '@/config/theme';
import { WorkstreamRow, useColFlex } from './WorkstreamRow';
import type { Workstream } from '../types/workstream.types';

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
  const colFlex = useColFlex();

  const TABLE_HEADERS: { label: string; flex: number; paddingLeft?: number }[] = [
    { label: 'Workstream',    flex: colFlex.name                            },
    { label: 'Project ID',    flex: colFlex.projectId                       },
    { label: 'Status',        flex: colFlex.status,   paddingLeft: 8        },
    { label: 'Progress',      flex: colFlex.percent + colFlex.progress      },
    { label: 'Current Stage', flex: colFlex.currentStage, paddingLeft: 8    },
    { label: 'Action',        flex: colFlex.action                          },
  ];

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
      className="rounded-lg border border-border bg-card"
      style={{ overflow: 'hidden', ...cardShadow }}
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
          backgroundColor: pressed ? colors.muted : colors.card,
        })}
        testID={testID ? `${testID}-header` : undefined}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text className="font-heading text-base font-semibold text-card-foreground">
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
        <View
          className="border-t border-border"
          testID={testID ? `${testID}-table` : undefined}
        >
          {/* Table header row */}
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: colors.card,
            }}
          >
            {TABLE_HEADERS.map((col) => (
              <View key={col.label} style={{ flex: col.flex, paddingLeft: col.paddingLeft }}>
                <Text
                  className="font-heading text-base text-card-foreground"
                  style={{ textAlign: 'center' }}
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
              colFlex={colFlex}
              testID={testID ? `${testID}-row-${w.id}` : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
};
