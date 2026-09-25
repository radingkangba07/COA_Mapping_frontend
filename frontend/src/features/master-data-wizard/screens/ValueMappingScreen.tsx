import React, { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { StepRail } from '@/shared/components/ui/StepRail';
import { toStepRail } from '../mappers/toStepRail';
import { getStep, STEPS } from '../utils/taxonomy';
import { useWizardStore } from '../store/wizard.store';
import type { EntityId } from '../dp-kit/types/entity';
import type { StepId } from '../types/wizard.types';

interface ValueMappingScreenProps {
  /** Defaults to wizard.store's entityId (set by MasterDataWizardScreen); overridable for tests/preview. */
  readonly entityId?: EntityId;
  /** Same plain-callback contract as FieldMappingScreen/SourceDataProfileScreen. */
  readonly onBack?: () => void;
  /** Navigate forward to step 7 (TestImport). Not yet wired when step 5/6 are built — at that point this callback should route to step 5 instead. */
  readonly onContinue?: () => void;
}

/**
 * The Value Mapping step, deliberately a placeholder. Mapping's "Continue
 * to Value Mapping" button (reference: mapping.page.html's pageHeader)
 * needs a real route to land on; this step's own content isn't built yet.
 * Keeps the same step rail / header shell as every other wizard screen
 * rather than a bare blank page, so navigating here doesn't look broken —
 * just unfinished, honestly labelled as such.
 */
export function ValueMappingScreen({
  entityId: entityIdProp,
  onBack: onBackProp,
  onContinue,
}: ValueMappingScreenProps): React.JSX.Element {
  const storeEntityId = useWizardStore((s) => s.entityId);
  const entityId = entityIdProp ?? storeEntityId ?? 'items';

  const canGoBack = Boolean(onBackProp);
  const handleBack = useCallback((): void => {
    onBackProp?.();
  }, [onBackProp]);
  const handleContinue = useCallback((): void => {
    onContinue?.();
  }, [onContinue]);

  const step = getStep('values');
  const stepRail = toStepRail('values' as StepId);

  const content = (
    <View className="flex-1 flex-col bg-background" testID="value-mapping-screen">
      <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">
        <StepRail rail={stepRail} />

        <View className="mt-8 mb-5 flex-row flex-wrap items-start justify-between gap-3">
          <View className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-heading text-[18px] font-bold text-foreground">{step.label}</Text>
              <Text className="font-body text-xs text-muted-foreground">
                {`Step ${step.n} of ${STEPS.length}`}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {canGoBack ? (
              <Button variant="outline" onPress={handleBack} testID="value-mapping-back">
                <View className="flex-row items-center justify-center gap-1.5">
                  <ArrowLeft size={14} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">Back</Text>
                </View>
              </Button>
            ) : null}
            {onContinue != null ? (
              <Button onPress={handleContinue} testID="value-mapping-continue">
                <Text className="text-sm font-semibold text-primary-foreground">Continue</Text>
              </Button>
            ) : null}
          </View>
        </View>

        <EmptyState
          title="Value Mapping isn't built yet"
          description="This step of the wizard is still in progress. Your field mappings from Step 3 are saved — come back here once Value Mapping ships."
          testID="value-mapping-empty"
        />
      </ScrollView>
    </View>
  );

  return content;
}
