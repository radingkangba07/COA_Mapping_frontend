import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Info } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { formatDateTime } from '@/shared/utils/date.utils';
import { SummaryRow } from './SummaryRow';
import type { Project } from '@/features/projects/types/projects.types';
import type { WorkstreamSectionGroup } from './WorkstreamSections';
import { getERPById } from '@/shared/constants/erp-systems';

function resolveErpName(raw: string | undefined | null): string {
  if (!raw || raw.trim() === '') return '—';
  const found = getERPById(raw);
  if (found) return found.name;
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveDocumentTarget(source: string | null | undefined, target: string | null | undefined): string {
  const s = source?.trim() || null;
  const t = target?.trim() || null;
  if (!s && !t) return '—';
  if (!s) return t ?? '—';
  if (!t) return s;
  return `${s} → ${t}`;
}

interface ProjectSummaryPanelProps {
  readonly project: Project;
  readonly groups: readonly WorkstreamSectionGroup[];
  readonly sourceDeployment?: string | null;
  readonly targetDeployment?: string | null;
  readonly testID?: string;
}

const SectionHeading = ({ title }: { readonly title: string }): React.JSX.Element => (
  <Text
    style={{
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.mutedForeground,
      marginBottom: 10,
    }}
  >
    {title}
  </Text>
);

const PanelDivider = (): React.JSX.Element => (
  <View className="bg-border" style={{ height: 1, marginVertical: 10 }} />
);

export const ProjectSummaryPanel = ({
  project,
  groups,
  sourceDeployment,
  targetDeployment,
  testID,
}: ProjectSummaryPanelProps): React.JSX.Element => {
  const totalWorkstreams = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 18 }}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {/* ── Panel heading ──────────────────────────────── */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: colors.foreground,
          marginBottom: 2,
        }}
      >
        Project Summary
      </Text>

      {/* ── Scope Overview ─────────────────────────────── */}
      <View>
        <SectionHeading title="Scope Overview" />
        <View style={{ gap: 8 }}>
          {groups.map((g) => {
            const selected = g.items.filter((w) => w.included).length;
            return (
              <SummaryRow
                key={g.key}
                label={g.title}
                value={`${selected} of ${g.items.length} selected`}
                testID={testID ? `${testID}-scope-${g.key}` : undefined}
              />
            );
          })}
        </View>
        <PanelDivider />
        <SummaryRow
          label="Total Workstreams"
          value={totalWorkstreams}
          testID={testID ? `${testID}-total` : undefined}
        />
      </View>

      {/* ── Migration Configuration ─────────────────────── */}
      <View>
        <SectionHeading title="Migration Configuration" />
        <View style={{ gap: 8 }}>
          <SummaryRow label="Source ERP"      value={resolveErpName(project.sourceErp)} />
          <SummaryRow label="Target ERP"      value={resolveErpName(project.targetErp)} />
          <SummaryRow
            label="Document Target"
            value={resolveDocumentTarget(sourceDeployment, targetDeployment)}
          />
          <SummaryRow
            label="Last Edited"
            value={formatDateTime(project.updatedAt)}
            testID={testID ? `${testID}-last-edited` : undefined}
          />
        </View>
      </View>

      {/* ── Info note ──────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          backgroundColor: 'rgba(37,99,235,0.06)',
          borderRadius: 8,
          padding: 12,
          borderWidth: 1,
          borderColor: 'rgba(37,99,235,0.18)',
        }}
        testID={testID ? `${testID}-info-note` : undefined}
      >
        <Info size={14} color={colors.accent} style={{ marginTop: 1, flexShrink: 0 }} />
        <Text style={{ fontSize: 11.5, color: colors.mutedForeground, flex: 1, lineHeight: 17 }}>
          Each workstream is an independent project with its own lifecycle and progress. Click any workstream to view details, upload files, validate, map and export.
        </Text>
      </View>
    </ScrollView>
  );
};
