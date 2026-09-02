import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface OpenFieldProfileIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's exact "open field profile" icon (a box
// with an arrow breaking out of its top-right corner) — the installed
// lucide-react-native's `ExternalLink` was redesigned to a smaller,
// more-inset box and no longer matches the reference's path geometry.
export function OpenFieldProfileIcon({ size = 16, color }: OpenFieldProfileIconProps): React.JSX.Element {
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
      <Path d="M15 3h6v6" />
      <Path d="M10 14 21 3" />
      <Path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </Svg>
  );
}
