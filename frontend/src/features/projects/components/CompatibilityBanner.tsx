import React from 'react';
import { View, Text } from 'react-native';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { colors } from '@/config/theme';

interface CompatibilityBannerProps {
  source: string | null;
  target: string | null;
  isCompatible: boolean;
  testID?: string;
}

const ICON_SIZE = 18;
const TINT_OPACITY = '1A';

export const CompatibilityBanner = ({
  source,
  target,
  isCompatible,
  testID,
}: CompatibilityBannerProps): React.JSX.Element => {
  const bothSet = source !== null && target !== null;

  if (!bothSet) {
    return (
      <View
        className="flex-row items-center gap-2 rounded-md bg-muted px-4 py-3"
        accessibilityRole="alert"
        testID={testID}
      >
        <Info size={ICON_SIZE} color={colors.mutedForeground} />
        <Text className="font-body text-sm text-muted-foreground">
          Selected systems and connection methods are compatible for migration.
        </Text>
      </View>
    );
  }

  const tint = isCompatible ? colors.success : colors.destructive;
  const Icon = isCompatible ? CheckCircle : AlertTriangle;
  const message = isCompatible
    ? `${source} → ${target} are compatible.`
    : `${source} and ${target} are not compatible.`;

  return (
    <View
      className="flex-row items-center gap-2 rounded-md px-4 py-3"
      style={{ backgroundColor: `${tint}${TINT_OPACITY}` }}
      accessibilityRole="alert"
      testID={testID}
    >
      <Icon size={ICON_SIZE} color={tint} />
      <Text className="font-body text-sm" style={{ color: tint }}>
        {message}
      </Text>
    </View>
  );
};
