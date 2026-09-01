import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface EyeOffIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's classic crossed-eye path — the installed
// lucide-react-native's `EyeOff` was redesigned to a different curve and no
// longer matches the reference's geometry.
export function EyeOffIcon({ size = 16, color }: EyeOffIconProps): React.JSX.Element {
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
      <Path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <Path d="M10.73 5.08A11 11 0 0 1 12 5c7 0 11 7 11 7a13 13 0 0 1-1.67 2.68" />
      <Path d="M6.61 6.61A13 13 0 0 0 1 12s4 7 11 7a11 11 0 0 0 5.39-1.39" />
      <Path d="M2 2l20 20" />
    </Svg>
  );
}
