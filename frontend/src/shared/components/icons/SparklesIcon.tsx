import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SparklesIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's readiness-banner icon — a large
// straight-edged star plus a smaller companion sparkle. The installed
// lucide-react-native's `Sparkles` uses a different curved-bezier shape
// plus extra cross/circle decorations and doesn't match this geometry.
export function SparklesIcon({ size = 16, color }: SparklesIconProps): React.JSX.Element {
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
      <Path d="M19 15l.7 1.9 1.9.7-1.9.7L19 21l-.7-1.7-1.9-.7 1.9-.7z" />
    </Svg>
  );
}
