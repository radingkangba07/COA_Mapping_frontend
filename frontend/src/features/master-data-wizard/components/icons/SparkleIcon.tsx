import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SparkleIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's "Mig" branding icon — a single
// straight-edged four-point star. The installed lucide-react-native's
// `Sparkle` is a curved bezier shape and doesn't match this geometry.
export function SparkleIcon({ size = 16, color }: SparkleIconProps): React.JSX.Element {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 3l1.9 4.8L18.6 9.6 13.9 11.5 12 16.3 10.1 11.5 5.4 9.6l4.7-1.8z" />
    </Svg>
  );
}
