import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '@/shared/utils/string.utils';

interface GradientChipProps {
  readonly start: string;
  readonly end: string;
  readonly fg: string;
  readonly children: React.ReactNode;
  /**
   * Two pill geometries: the default is `min-width:58px;padding:3px 10px`
   * (`'nullRows'`); `'confidence'` is a smaller/tighter `min-width:54px;
   * padding:4px 12px`. Both share the same font/gradient/shape otherwise —
   * only these two dimensions differ.
   */
  readonly size?: 'nullRows' | 'confidence';
  /** Overrides alignment only — e.g. `self-center` for a table cell that centres its content. Defaults to self-start. */
  readonly className?: string;
  readonly testID?: string;
}

/**
 * Continuous-value gradient pill — its own full pill (rounded-full, 11px
 * bold) with a 135deg two-stop gradient standing in for a CSS
 * `linear-gradient(135deg, …)`.
 *
 * NativeWind v4 only resolves `className` on components it patches itself
 * (View, Text, …) or ones explicitly registered via cssInterop — a
 * third-party LinearGradient isn't one of those. So the className/shape
 * lives on a plain outer View (clips corners via overflow-hidden); the
 * gradient just fills it with a bare RN style object.
 */
export const GradientChip = ({ start, end, fg, children, size = 'nullRows', className, testID }: GradientChipProps): React.JSX.Element => {
  const isConfidence = size === 'confidence';
  return (
    <View
      className={cn(isConfidence ? 'min-w-[54px]' : 'min-w-[58px]', 'self-start overflow-hidden rounded-full', className)}
      testID={testID}
    >
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: isConfidence ? 12 : 10,
          paddingVertical: isConfidence ? 4 : 3,
        }}
      >
        <Text className="font-mono text-[11px] font-semibold" style={{ color: fg }}>
          {children}
        </Text>
      </LinearGradient>
    </View>
  );
};
