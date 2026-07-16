import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Info } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { formatDateTime } from '@/shared/utils/date.utils';
import { SummaryRow } from './SummaryRow';
import type { Project } from '@/features/projects/types/projects.types';
import type { WorkstreamSectionGroup } from './WorkstreamSections';
import { getERPById } from '@/shared/constants/erp-systems';

// Display labels for the backend connection-method catalog ids
// (erp_systems.yaml), which project GET responses return verbatim.
const CONNECTION_METHOD_LABELS: Record<string, string> = {
  csv_file: 'CSV File Upload',
  mcp_server: 'MCP Server',
  cloud_saas: 'Cloud (SaaS)',
  on_premise: 'On-Premise (Self-Hosted)',
};

/** Wizard fields present on project GET responses but not yet on the Project domain type. */
interface ProjectConnectionFields {
  readonly sourceConnectionMethodId?: string | undefined;
  readonly targetConnectionMethodId?: string | undefined;
}

function resolveErpName(raw: string | undefined | null): string {
  if (!raw || raw.trim() === '') return '—';
  const found = getERPById(raw);
  if (found) return found.name;
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveConnectionMethod(method: string | undefined): string {
  if (method === undefined || method === '') return '—';
  return CONNECTION_METHOD_LABELS[method] ?? method;
}

function resolveProductName(erpId: string | undefined | null): string {
  if (!erpId || erpId.trim() === '') return '—';
  return getERPById(erpId)?.productName ?? '—';
}

interface ProjectSummaryPanelProps {
  readonly project: Project & ProjectConnectionFields;
  readonly groups: readonly WorkstreamSectionGroup[];
  readonly testID?: string;
}

const SectionHeading = ({ title }: { readonly title: string }): React.JSX.Element => (
  <Text
    className="font-heading text-base text-foreground"
    style={{ marginBottom: 14 }}
  >
    {title}
  </Text>
);

const PanelDivider = (): React.JSX.Element => (
  <View className="bg-border" style={{ height: 1, marginVertical: 16 }} />
);

export const ProjectSummaryPanel = ({
  project,
  groups,
  testID,
}: ProjectSummaryPanelProps): React.JSX.Element => {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {/* ── Panel heading ──────────────────────────────── */}
      <Text
        className="font-heading text-base font-semibold text-foreground"
        style={{ marginBottom: 42 }}
      >
        Project Summary
      </Text>
      <PanelDivider />

      {/* ── Scope Overview ─────────────────────────────── */}
      <View>
        <SectionHeading title="Scope Overview" />
        <View style={{ gap: 14 }}>
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
        {/* Divider sits tight above the next heading; the triple spacing lives above the line. */}
        <View className="bg-border" style={{ height: 1, marginTop: 42, marginBottom: 14 }} />
      </View>

      {/* ── Migration Configuration ─────────────────────── */}
      <View>
        <SectionHeading title="Migration Configuration" />
        <View style={{ gap: 28 }}>
          <View style={{ gap: 14 }}>
            <SummaryRow label="Source ERP" value={resolveErpName(project.sourceErp)} />
            <SummaryRow label="Target ERP" value={resolveErpName(project.targetErp)} />
          </View>
          <View style={{ gap: 14 }}>
            <SummaryRow
              label="Source Product"
              value={resolveProductName(project.sourceErp)}
              testID={testID ? `${testID}-product-source` : undefined}
            />
            <SummaryRow
              label="Target Product"
              value={resolveProductName(project.targetErp)}
              testID={testID ? `${testID}-product-target` : undefined}
            />
          </View>
          <View style={{ gap: 14 }}>
            <SummaryRow
              label="Connection Method (Source)"
              value={resolveConnectionMethod(project.sourceConnectionMethodId)}
              testID={testID ? `${testID}-connection-method-source` : undefined}
            />
            <SummaryRow
              label="Connection Method (Target)"
              value={resolveConnectionMethod(project.targetConnectionMethodId)}
              testID={testID ? `${testID}-connection-method-target` : undefined}
            />
          </View>
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
          marginTop: 20,
          backgroundColor: 'rgba(37,99,235,0.06)',
          borderRadius: 8,
          padding: 12,
          borderWidth: 1,
          borderColor: 'rgba(37,99,235,0.18)',
        }}
        testID={testID ? `${testID}-info-note` : undefined}
      >
        <Info size={14} color={colors.accent} style={{ marginTop: 1, flexShrink: 0 }} />
        <Text className="font-body text-xs text-muted-foreground" style={{ flex: 1, lineHeight: 18 }}>
          Each workstream is an independent project with its own lifecycle and progress. Click any workstream to view details, upload files, validate, map and export.
        </Text>
      </View>
    </ScrollView>
  );
};
