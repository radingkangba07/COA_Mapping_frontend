import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface MoonIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's exact crescent path — lucide's current
// `Moon` icon has since moved to a different "swoosh" crescent shape and no
// longer matches.
export function MoonIcon({ size = 15, color }: MoonIconProps): React.JSX.Element {
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
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  );
}
