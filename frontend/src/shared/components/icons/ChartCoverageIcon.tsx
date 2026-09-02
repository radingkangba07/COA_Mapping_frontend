import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface ChartCoverageIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's exact coverage-chart icon (axis + three
// ascending bars) — none of lucide's many chart icons match this specific
// construction.
export function ChartCoverageIcon({ size = 14, color }: ChartCoverageIconProps): React.JSX.Element {
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
      <Path d="M3 3v18h18" />
      <Rect x="7" y="12" width="3" height="6" />
      <Rect x="12" y="8" width="3" height="10" />
      <Rect x="17" y="4" width="3" height="14" />
    </Svg>
  );
}
