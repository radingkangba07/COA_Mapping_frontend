/* ============================================================================
   StepRail.tsx  ·  RN translation of dp-kit's step rail
   ----------------------------------------------------------------------------
   Spec: docs/handover/app/react/components.tsx (StepRail), reference/dp-base.js
   shellVals().steps. Renders whatever hooks/useWizardSteps.ts hands it — it
   never reads the taxonomy itself, so it cannot drift from the canonical step
   list (root CLAUDE.md, wizard rule #3).

   Colour comes only from the base theme tokens (primary/border/muted-
   foreground/foreground) — done/active/todo is a progress state, not one of
   the four semantic families (impact/find/metricTone/prov), so there is no
   semanticClass() call here; there is nothing to look up.
   ========================================================================= */

import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/config/theme';
import type { StepRailModel, StepRailItem } from '@/features/master-data-wizard/mappers/toStepRail';
import type { StepId } from '@/features/master-data-wizard/types/wizard.types';

interface StepRailProps {
  rail: StepRailModel;
  /** Omit to make the rail display-only — done/active steps are the only ones ever clickable. */
  onStepPress?: (stepId: StepId) => void;
}

export function StepRail({ rail, onStepPress }: StepRailProps): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row items-center py-2 px-2"
      testID="wizard-step-rail"
    >
      {rail.items.map((item, i) => (
        <React.Fragment key={item.id}>
          <StepDot item={item} onPress={onStepPress} />
          {i < rail.items.length - 1 && (
            <View
              className={`w-5 h-0 border mx-2 ${item.state === 'done' ? 'border-primary' : 'border-border'}`}
            />
          )}
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

interface StepDotProps {
  item: StepRailItem;
  onPress?: (stepId: StepId) => void;
}

function StepDot({ item, onPress }: StepDotProps): React.JSX.Element {
  const clickable = item.state !== 'todo' && onPress !== undefined;

  return (
    <Pressable
      disabled={!clickable}
      onPress={() => onPress?.(item.id)}
      className="flex-row items-center gap-1"
      accessibilityRole="button"
      accessibilityLabel={`Step ${item.n}: ${item.label}`}
      accessibilityState={{ selected: item.state === 'active', disabled: !clickable }}
    >
      <View
        className={`h-5 aspect-square rounded-full items-center justify-center ${
          item.state === 'todo' ? 'bg-transparent border-[1.5px] border-border' : 'bg-primary'
        }`}
      >
        {item.state === 'done' ? (
          <Check size={12} color={colors.primaryForeground} strokeWidth={3} />
        ) : (
          <Text
            className={`text-[11px] leading-[14px] font-bold text-center ${
              item.state === 'todo' ? 'text-muted-foreground' : 'text-primary-foreground'
            }`}
          >
            {item.n}
          </Text>
        )}
      </View>
      <Text
        className={`text-sm ps-1 ${item.state === 'todo' ? 'text-muted-foreground' : 'text-foreground'} ${
          item.state === 'active' ? 'font-bold' : 'font-medium'
        }`}
        numberOfLines={1}
      >
        {item.short}
      </Text>
    </Pressable>
  );
}
