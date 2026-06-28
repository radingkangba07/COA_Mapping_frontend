// Read-only Project Summary card for the Project Scope page (DA-145).
// Hosts six chip slots in a responsive 1/2/3-column grid via SummaryChip.
// Pure: props in, render out. No store access, no hooks beyond React.

import React from 'react';
import { View, Text } from 'react-native';
import { Database, PlugZap, Layers, Wallet, Users } from 'lucide-react-native';
import { SummaryChip } from './SummaryChip';

interface ProjectSummaryBarProps {
  readonly summary: {
    readonly source: string | null;
    readonly target: string | null;
    readonly method: string | null;
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

const SLOT_CLASS = 'basis-full sm:basis-[48%] lg:basis-[31%]';

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
      slug: 'method',
      icon: PlugZap,
      label: 'Connection Method',
      value: summary.method,
      placeholder: 'Not set',
    },
    {
      slug: 'master-data',
      icon: Layers,
      label: 'Master Data',
      value: summary.masterData,
    },
    {
      slug: 'opening-balances',
      icon: Wallet,
      label: 'Opening Balances',
      value: summary.openingBalances,
    },
    {
      slug: 'members',
      icon: Users,
      label: 'Members',
      value: summary.members,
    },
  ];

  return (
    <View
      className="rounded-lg border border-border bg-card p-4"
      testID={testID}
    >
      <Text className="font-heading text-base font-semibold text-card-foreground">
        Project Summary
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-3">
        {chips.map((chip) => (
          <View key={chip.slug} className={SLOT_CLASS}>
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
