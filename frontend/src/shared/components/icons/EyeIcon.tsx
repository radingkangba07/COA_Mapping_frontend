import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface EyeIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's classic eye path — the installed
// lucide-react-native's `Eye` was redesigned to a different curve and no
// longer matches the reference's geometry.
export function EyeIcon({ size = 16, color }: EyeIconProps): React.JSX.Element {
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
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}
