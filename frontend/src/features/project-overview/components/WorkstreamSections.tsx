import React from 'react';
import { View } from 'react-native';
import { useSectionState } from '../hooks/useSectionState';
import { WorkstreamGroup } from './WorkstreamGroup';
import type { Workstream } from '../types/workstream.types';

export interface WorkstreamSectionGroup {
  readonly key: string;
  readonly title: string;
  readonly items: readonly Workstream[];
}

interface WorkstreamSectionsProps {
  readonly groups: readonly WorkstreamSectionGroup[];
  readonly onOpen: (w: Workstream) => void;
  readonly testID?: string;
}

export const WorkstreamSections = ({
  groups,
  onOpen,
  testID,
}: WorkstreamSectionsProps): React.JSX.Element => {
  const [collapsed, toggle] = useSectionState();

  return (
    <View style={{ gap: 16 }} testID={testID}>
      {groups.map((g) => (
        <WorkstreamGroup
          key={g.key}
          title={g.title}
          workstreams={g.items}
          expanded={!collapsed[g.key]}
          onToggle={() => toggle(g.key)}
          onOpen={onOpen}
          testID={testID ? `${testID}-${g.key}` : undefined}
        />
      ))}
    </View>
  );
};
