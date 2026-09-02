import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SendIconProps {
  readonly size?: number;
  readonly color: string;
}

// Reproduces the reference HTML's composer send-button icon — a classic
// outline paper-plane. The installed lucide-react-native's `Send` was
// redesigned to a different, filled-plane shape and doesn't match this
// geometry.
export function SendIcon({ size = 16, color }: SendIconProps): React.JSX.Element {
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
      <Path d="M22 2 11 13" />
      <Path d="M22 2 15 22l-4-9-9-4z" />
    </Svg>
  );
}
