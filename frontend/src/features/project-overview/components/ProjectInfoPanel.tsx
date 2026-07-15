import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Users, ArrowRight } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { ERP_SYSTEMS } from '@/shared/constants/erp-systems';
import { formatDateTime } from '@/shared/utils/date.utils';
import type { Project } from '@/features/projects/types/projects.types';
import type { AccessResponse } from '@/features/projects/types/project-access.types';

interface ProjectInfoPanelProps {
  readonly project: Project;
  readonly members: readonly AccessResponse[];
  readonly workstreamCount: number;
  readonly onMembersPress?: () => void;
  readonly testID?: string;
}

// ─── ERP display helpers ────────────────────────────────────────────────────

function erpColor(name: string): string {
  const flat = name.toLowerCase().replace(/\s+/g, '');
  const match = ERP_SYSTEMS.find(erp => {
    const flatId = erp.id.replace('_', '');
    return flat.includes(flatId) || name.toLowerCase().includes(erp.name.toLowerCase().split(' ')[0] ?? '');
  });
  return match?.brandColor ?? colors.primary;
}

function erpInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const SectionLabel = ({
  title,
  count,
}: {
  readonly title: string;
  readonly count?: number;
}): React.JSX.Element => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
    <Text
      style={{
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: colors.mutedForeground,
      }}
    >
      {title}
    </Text>
    {count !== undefined && (
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground }}>{count}</Text>
    )}
  </View>
);

const PanelDivider = (): React.JSX.Element => (
  <View className="bg-border" style={{ height: 1, marginVertical: 2 }} />
);

const MetaBlock = ({
  label,
  value,
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
}): React.JSX.Element => (
  <View style={{ marginBottom: 10 }}>
    <Text
      style={{
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        color: colors.mutedForeground,
        marginBottom: 2,
      }}
    >
      {label}
    </Text>
    <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.foreground }}>{value}</Text>
    {sub !== undefined && sub.length > 0 && (
      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{sub}</Text>
    )}
  </View>
);

const InitialAvatar = ({
  name,
  size = 28,
  bg,
}: {
  readonly name: string;
  readonly size?: number;
  readonly bg?: string;
}): React.JSX.Element => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bg ?? colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <Text style={{ color: colors.primaryForeground, fontSize: size * 0.4, fontWeight: '700' }}>
      {name.trim().charAt(0).toUpperCase()}
    </Text>
  </View>
);

// ─── Main component ──────────────────────────────────────────────────────────

export const ProjectInfoPanel = ({
  project,
  members,
  workstreamCount,
  onMembersPress,
  testID,
}: ProjectInfoPanelProps): React.JSX.Element => {
  const creatorName = project.createdByName ?? 'Unknown';
  const updaterName = project.updatedByName ?? creatorName;
  const projectIdShort = `PRJ-${project.createdAt.getFullYear()}`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.card }}
      contentContainerStyle={{ paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {/* ── Project title + creator ──────────────────────── */}
      <View className="border-b border-border" style={{ padding: 14 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, lineHeight: 20 }}
          numberOfLines={2}
        >
          {project.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <InitialAvatar name={creatorName} />
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.foreground }}>
            {creatorName}
          </Text>
        </View>
      </View>

      {/* ── Members button ───────────────────────────────── */}
      <Pressable
        onPress={onMembersPress}
        className="border border-border"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginHorizontal: 14,
          marginTop: 12,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: pressed ? colors.muted : colors.card,
        })}
        testID={testID ? `${testID}-members-btn` : undefined}
      >
        <Users size={14} color={colors.mutedForeground} />
        <Text style={{ fontSize: 12, fontWeight: '500', color: colors.mutedForeground }}>
          Members
        </Text>
      </Pressable>

      {/* ── Members list ─────────────────────────────────── */}
      <View className="border-t border-border" style={{ padding: 14, marginTop: 12 }}>
        <SectionLabel title="Members" count={members.length} />
        <View style={{ gap: 8 }}>
          {members.length === 0 ? (
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>No members yet</Text>
          ) : (
            members.map((m) => (
              <View key={String(m.userId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <InitialAvatar name={m.name} />
                <View>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: colors.foreground }}>
                    {m.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{m.permission}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <PanelDivider />

      {/* ── Project metadata ─────────────────────────────── */}
      <View style={{ padding: 14 }}>
        {/* Project ID — inline label + value */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 9.5,
              fontWeight: '700',
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              color: colors.mutedForeground,
            }}
          >
            Project ID
          </Text>
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.foreground, fontFamily: 'monospace' }}>
            {projectIdShort}
          </Text>
        </View>

        <MetaBlock
          label="Created At"
          value={formatDateTime(project.createdAt)}
          sub={`by ${creatorName}`}
        />
        <MetaBlock
          label="Last Edited"
          value={formatDateTime(project.updatedAt)}
          sub={`by ${updaterName}`}
        />
      </View>

      <PanelDivider />

      {/* ── Migration ERP diagram ─────────────────────────── */}
      <View style={{ padding: 14 }}>
        <SectionLabel title="Migration" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Source ERP */}
          <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: erpColor(project.sourceErp),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '800' }}>
                {erpInitial(project.sourceErp)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: colors.foreground,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {project.sourceErp}
            </Text>
            <Text style={{ fontSize: 10, color: colors.mutedForeground, textAlign: 'center' }}>
              {workstreamCount} workstreams
            </Text>
          </View>

          {/* Arrow */}
          <ArrowRight size={18} color={colors.mutedForeground} />

          {/* Target ERP */}
          <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: erpColor(project.targetErp),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.primaryForeground, fontSize: 16, fontWeight: '800' }}>
                {erpInitial(project.targetErp)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: colors.foreground,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {project.targetErp}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
