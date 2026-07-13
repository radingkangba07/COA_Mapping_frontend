// Read-only Project Summary card for the Project Scope page (DA-145).
// Hosts six chip slots in a responsive 1/2/3-column grid via SummaryChip.
// Pure: props in, render out. No store access, no hooks beyond React.

import React from 'react';
import { View, Text } from 'react-native';
import { Database, FileUser, Link, List, UsersRound } from 'lucide-react-native';
import { SummaryChip } from './SummaryChip';

interface ProjectSummaryBarProps {
  readonly summary: {
    readonly source: string | null;
    readonly target: string | null;
    readonly connectionMethod: string | null;
    readonly masterData: string;
    readonly openingBalances: string;
    readonly members: string;
  };
  readonly testID?: string;
}

interface ChipDescriptor {
  readonly slug: string;
  readonly icon: React.ComponentType<{
    size?: number;
    color?: string;
    className?: string;
  }>;
  readonly label: string;
  readonly value: string | null;
  readonly placeholder?: string;
}

export function ProjectSummaryBar({
  summary,
  testID,
}: ProjectSummaryBarProps): React.JSX.Element {
  const chips: readonly ChipDescriptor[] = [
    {
      slug: 'source',
      icon: Database,
      label: 'Source ERP',
      value: summary.source,
      placeholder: 'Select source',
    },
    {
      slug: 'target',
      icon: Database,
      label: 'Target ERP',
      value: summary.target,
      placeholder: 'Select target',
    },
    {
      slug: 'connection-method',
      icon: Link,
      label: 'Connection Method',
      value: summary.connectionMethod,
      placeholder: 'Not set',
    },
    {
      slug: 'master-data',
      icon: List,
      label: 'Master Data',
      value: summary.masterData,
    },
    {
      slug: 'opening-balances',
      icon: FileUser,
      label: 'Opening Balances',
      value: summary.openingBalances,
    },
    {
      slug: 'members',
      icon: UsersRound,
      label: 'Members',
      value: summary.members,
    },
  ];

  return (
    <View
      className="rounded-lg border border-border bg-card p-4"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
      testID={testID}
    >
      <View className="flex-row flex-wrap items-baseline gap-2">
        <Text className="font-heading text-base font-semibold text-card-foreground">
          Project Summary
        </Text>
        <Text className="font-body text-sm text-muted-foreground">
          Review your selections and project configuration
        </Text>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-y-5">
        {chips.map((chip) => (
          <View key={chip.slug} className={'flex-1'}>
            <SummaryChip
              icon={chip.icon}
              label={chip.label}
              value={chip.value}
              placeholder={chip.placeholder}
              testID={
                testID !== undefined ? `${testID}-chip-${chip.slug}` : undefined
              }
            />
          </View>
        ))}
      </View>
    </View>
  );
}
