import React from 'react';
import { Text, View } from 'react-native';
import { useAppStore } from '@/shared/store/app.store';
import { semantic } from '../../dp-kit/native/dp-theme';

interface ProvenanceLabelProps {
  readonly state: 'fact' | 'ai' | 'action';
  readonly children: string;
}

/**
 * The reference's small dot + uppercase provenance marker — plain coloured
 * text, never a filled pill. `SemanticBadge` is correct for `impact`/`find`
 * (real pills in the reference) but must not be reused for `prov`, which
 * the reference never fills or pads (`[data-prov="fact"]{color:var(--muted)}`
 * with no background).
 */
export function ProvenanceLabel({ state, children }: ProvenanceLabelProps): React.JSX.Element {
  const mode = useAppStore((s) => s.theme);
  const { fg } = semantic('prov', state, mode);

  return (
    <View className="flex-row items-center gap-1">
      <View className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: fg }} />
      <Text className="font-body text-[9.5px] font-bold uppercase tracking-wide" style={{ color: fg }}>
        {children}
      </Text>
    </View>
  );
}
